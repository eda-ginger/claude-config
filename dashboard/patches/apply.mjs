#!/usr/bin/env node
// Re-applies local patches to the claude-dashboard statusline bundle.
//
// Design rules learned the hard way (2026-11-09, plugin 1.36.0):
//   * Patches are INDEPENDENT. One patch whose anchor is gone must never stop
//     the others. The first version of this script threw on a missing anchor,
//     so when upstream fixed the model-version bug in 1.36.0 the account
//     widget silently stopped being installed too.
//   * A missing anchor on an `optional` patch means "upstream fixed it" and is
//     reported as obsolete, not as an error.
//   * Injected code must not reference bundle-internal identifiers. esbuild
//     renames imports by bundling order (`join` may become `join9`), so the
//     widget resolves node builtins itself.
//
// Idempotent: already-patched files are left alone. Safe to run on every
// plugin update, or from statusline.sh on a cache miss.
//
// Usage: node apply.mjs [path/to/dist/index.js]
//        With no argument it patches the newest installed claude-dashboard.
//
// Exit 0 = bundle is in its best achievable state (patched / already current /
//          upstream made a patch obsolete). Exit 1 = could not read or write.

import { readFile, writeFile, copyFile, readdir, stat, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const MARKER = "[local patch: logged-in Claude account]";
const LOG = join(homedir(), ".cache", "claude-config", "last-patch.log");

// --- patch definitions ----------------------------------------------------
// present(src) -> already applied?
// anchored(src) -> anchors available, so it can be applied?
// run(src) -> patched source
// optional    -> a missing anchor is expected once upstream fixes it

const patches = [
  {
    name: "model-version",
    note: "derive model version from id instead of the hardcoded 4.6/4.5",
    optional: true, // fixed upstream in 1.36.0
    present: (s) => s.includes("(?:opus|sonnet|haiku|fable)-"),
    anchored: (s) => s.includes(HARDCODED_VERSION),
    run: (s) => s.replace(HARDCODED_VERSION, DERIVED_VERSION),
  },
  {
    name: "account-widget",
    note: "show the logged-in Claude account next to folder/branch",
    optional: false,
    present: (s) => s.includes(MARKER),
    anchored: (s) => s.includes(REGISTRY_ANCHOR) && s.includes(ENTRY_ANCHOR),
    run: (s) =>
      s
        .replace(REGISTRY_ANCHOR, ACCOUNT_WIDGET + REGISTRY_ANCHOR)
        .replace(ENTRY_ANCHOR, ENTRY_ANCHOR + '\n  ["account", accountWidget],'),
  },
];

const HARDCODED_VERSION =
  '    const version = data.id.includes("opus") ? "4.6" : data.id.includes("sonnet") ? "4.6" : data.id.includes("haiku") ? "4.5" : "";';

const DERIVED_VERSION =
  '    const versionMatch = data.id.match(/(?:opus|sonnet|haiku|fable)-(\\d+)(?:-(\\d{1,2}))?(?!\\d)/);\n' +
  '    const version = versionMatch ? (versionMatch[2] ? `${versionMatch[1]}.${versionMatch[2]}` : versionMatch[1]) : "";';

const REGISTRY_ANCHOR = "var widgetRegistry = /* @__PURE__ */ new Map([";
const ENTRY_ANCHOR = '  ["projectInfo", projectInfoWidget],';

// Self-contained: resolves node builtins at call time and falls back to plain
// text if the bundle's colorize/getTheme are not reachable under these names.
const ACCOUNT_WIDGET = `// scripts/widgets/account.ts  ${MARKER}
var accountInfoCache = null;
async function getAccountInfo() {
  try {
    const { readFile: _rf, stat: _st } = await import("node:fs/promises");
    const home = process.env.HOME || (await import("node:os")).homedir();
    const p = home + "/.claude.json";
    const st = await _st(p);
    if (accountInfoCache && accountInfoCache.mtime === st.mtimeMs) {
      return accountInfoCache.value;
    }
    const raw = await _rf(p, "utf-8");
    const acct = JSON.parse(raw)?.oauthAccount ?? null;
    const value = acct?.emailAddress ? {
      email: acct.emailAddress,
      plan: acct.organizationType ?? null,
      role: acct.organizationRole ?? null
    } : null;
    accountInfoCache = { mtime: st.mtimeMs, value };
    return value;
  } catch {
    return null;
  }
}
var accountWidget = {
  id: "account",
  name: "Account",
  async getData(_ctx) {
    return await getAccountInfo();
  },
  render(data, ctx) {
    const fmt = ctx?.config?.accountFormat ?? "email";
    const email = data.email;
    const at = email.lastIndexOf("@");
    let label;
    if (fmt === "user") {
      label = at > 0 ? email.slice(0, at) : email;
    } else if (fmt === "domain") {
      label = at > 0 ? email.slice(at + 1) : email;
    } else {
      label = email;
    }
    const icon = ctx?.config?.accountIcon ?? "\\u{1F464}";
    const text = \`\${icon} \${label}\`;
    try {
      return colorize(text, getTheme().info);
    } catch {
      return text;
    }
  }
};

`;

// --- locate the bundle ----------------------------------------------------

async function newestDist() {
  const base = join(homedir(), ".claude", "plugins", "cache", "claude-dashboard", "claude-dashboard");
  let versions;
  try {
    versions = await readdir(base);
  } catch {
    throw new Error(`claude-dashboard plugin not installed (${base} missing)`);
  }
  const parsed = versions
    .map((v) => ({ v, parts: v.split(".").map((n) => parseInt(n, 10)) }))
    .filter((x) => x.parts.length > 0 && x.parts.every((n) => Number.isInteger(n)));
  if (parsed.length === 0) throw new Error(`no version directories under ${base}`);
  parsed.sort((a, b) => {
    for (let i = 0; i < Math.max(a.parts.length, b.parts.length); i++) {
      const d = (a.parts[i] ?? 0) - (b.parts[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  });
  return join(base, parsed.at(-1).v, "dist", "index.js");
}

// --- main -----------------------------------------------------------------

const lines = [];
function report(line) {
  lines.push(line);
  console.log(line);
}

let target;
let src;
try {
  target = process.argv[2] ?? (await newestDist());
  src = await readFile(target, "utf-8");
} catch (err) {
  console.error(`apply.mjs: ${err.message}`);
  process.exit(1);
}

report(`bundle: ${target}`);

let out = src;
const changed = [];
let hardFailure = false;

for (const p of patches) {
  try {
    if (p.present(out)) {
      report(`  = ${p.name}: already applied`);
    } else if (!p.anchored(out)) {
      if (p.optional) {
        report(`  ~ ${p.name}: obsolete (anchor gone — upstream fixed it)`);
      } else {
        report(`  ! ${p.name}: ANCHOR MISSING — patch needs updating for this version`);
        hardFailure = true;
      }
    } else {
      out = p.run(out);
      changed.push(p.name);
      report(`  + ${p.name}: applied (${p.note})`);
    }
  } catch (err) {
    report(`  ! ${p.name}: failed — ${err.message}`);
    if (!p.optional) hardFailure = true;
  }
}

if (changed.length > 0) {
  // Rollback copy of the file as it was before the first patch run.
  const backup = `${target}.bak-prepatch`;
  try {
    await stat(backup);
  } catch {
    await copyFile(target, backup);
  }
  try {
    await writeFile(target, out, "utf-8");
    report(`wrote ${changed.length} patch(es): ${changed.join(", ")}`);
  } catch (err) {
    console.error(`apply.mjs: write failed — ${err.message}`);
    process.exit(1);
  }
} else {
  report("no changes needed");
}

// Leave a trace so a broken statusline can be diagnosed without guesswork.
try {
  await mkdir(dirname(LOG), { recursive: true });
  await writeFile(LOG, `${new Date().toISOString()}\n${lines.join("\n")}\n`, "utf-8");
} catch {
  /* logging is best-effort */
}

// Exit 0 even on a hard failure: the bundle is still runnable and retrying on
// every render would not help. The log and the printed `!` line say what broke.
process.exit(0);
