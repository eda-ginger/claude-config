#!/usr/bin/env node
// Re-applies local patches to the claude-dashboard statusline bundle.
//
// Idempotent: already-patched files are left alone, so it is safe to run on
// every plugin update (or from statusline.sh on a cache miss).
//
// Usage: node apply.mjs [path/to/dist/index.js]
//        With no argument it patches the newest installed claude-dashboard.
//
// Exit codes: 0 = patched or already current, 1 = failed (anchor missing etc.)

import { readFile, writeFile, copyFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const MARKER = "[local patch: logged-in Claude account]";

// --- patch definitions ----------------------------------------------------
// Each patch: { name, test(src) -> bool (true = already applied), run(src) -> src }

const patches = [
  {
    name: "model-version: derive version from model id instead of hardcoding",
    // Upstream hardcodes "4.6"/"4.5", so Opus 5 renders as "Opus 4.6".
    test: (s) => s.includes("(?:opus|sonnet|haiku|fable)-"),
    run: (s) => {
      const from =
        '    const version = data.id.includes("opus") ? "4.6" : data.id.includes("sonnet") ? "4.6" : data.id.includes("haiku") ? "4.5" : "";';
      const to =
        '    const versionMatch = data.id.match(/(?:opus|sonnet|haiku|fable)-(\\d+)(?:-(\\d{1,2}))?(?!\\d)/);\n' +
        '    const version = versionMatch ? (versionMatch[2] ? `${versionMatch[1]}.${versionMatch[2]}` : versionMatch[1]) : "";';
      if (!s.includes(from)) throw new Error("anchor not found: hardcoded model version");
      return s.replace(from, to);
    },
  },
  {
    name: "account widget: show the logged-in Claude account",
    test: (s) => s.includes(MARKER),
    run: (s) => {
      const widget = `// scripts/widgets/account.ts  ${MARKER}
var accountInfoCache = null;
async function getAccountInfo() {
  try {
    const p = join(homedir(), ".claude.json");
    const st = await stat(p);
    if (accountInfoCache && accountInfoCache.mtime === st.mtimeMs) {
      return accountInfoCache.value;
    }
    const raw = await readFile(p, "utf-8");
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
    return colorize(\`\${icon} \${label}\`, getTheme().info);
  }
};

`;
      const regAnchor = "var widgetRegistry = /* @__PURE__ */ new Map([";
      if (!s.includes(regAnchor)) throw new Error("anchor not found: widgetRegistry");
      s = s.replace(regAnchor, widget + regAnchor);

      const entryAnchor = '  ["projectInfo", projectInfoWidget],';
      if (!s.includes(entryAnchor)) throw new Error("anchor not found: projectInfo registry entry");
      return s.replace(entryAnchor, entryAnchor + '\n  ["account", accountWidget],');
    },
  },
];

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
    .filter((x) => x.parts.every((n) => Number.isInteger(n)));
  if (parsed.length === 0) throw new Error(`no version directories under ${base}`);
  parsed.sort((a, b) => {
    for (let i = 0; i < Math.max(a.parts.length, b.parts.length); i++) {
      const d = (a.parts[i] ?? 0) - (b.parts[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  });
  return join(base, parsed[parsed.length - 1].v, "dist", "index.js");
}

// --- main -----------------------------------------------------------------

const target = process.argv[2] ?? (await newestDist());
const src = await readFile(target, "utf-8");

const todo = patches.filter((p) => !p.test(src));
if (todo.length === 0) {
  console.log(`already patched: ${target}`);
  process.exit(0);
}

let out = src;
for (const p of todo) out = p.run(out);

// Keep a rollback copy of the file as it was before the first patch run.
const backup = `${target}.bak-prepatch`;
try {
  await stat(backup);
} catch {
  await copyFile(target, backup);
}

await writeFile(target, out, "utf-8");
console.log(`patched ${target}`);
for (const p of todo) console.log(`  + ${p.name}`);
