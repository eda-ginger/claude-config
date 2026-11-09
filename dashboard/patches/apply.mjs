#!/usr/bin/env node
// Re-applies local patches to the claude-dashboard statusline bundle.
//
// The patch definitions live in anchors.mjs and mirror vault
// `04. Resources/tools/claude-dashboard-setup.md` 4-1 … 4-12. Upstream ships
// none of them, so an unpatched bundle renders stock.
//
// Design rules learned the hard way (2026-11-09, plugin 1.36.0):
//   * Patches are INDEPENDENT. One patch whose anchor is gone must never stop
//     the others. The first version of this script threw on a missing anchor,
//     so when upstream changed shape the account widget stopped installing too.
//   * A missing anchor on an `optional` patch means "not applicable to this
//     bundle" and is reported, not raised.
//   * Injected code must not reference bundle-internal identifiers. esbuild
//     renames imports by bundling order (`join` may become `join9`), so
//     injected code resolves node builtins itself.
//
// Idempotent: already-patched bundles are left alone. Safe to run on every
// plugin update, or from statusline.sh on a cache miss.
//
// Usage: node apply.mjs [path/to/dist/index.js]
//        With no argument it patches the newest installed claude-dashboard.
//
// Exit 0 = bundle is in its best achievable state. Exit 1 = unreadable or
//          unwritable bundle, where retrying later is the right move.

import { readFile, writeFile, copyFile, readdir, stat, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { patches } from "./anchors.mjs";

const LOG = join(homedir(), ".cache", "claude-config", "last-patch.log");

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
const notApplicable = [];
let hardFailure = false;

for (const p of patches) {
  const tag = `${p.name} (${p.doc})`;
  try {
    if (p.present(out)) {
      report(`  = ${tag}: already applied`);
    } else if (!p.anchored(out)) {
      if (p.optional) {
        notApplicable.push(p.name);
      } else {
        report(`  ! ${tag}: ANCHOR MISSING — patch needs updating for this version`);
        hardFailure = true;
      }
    } else {
      out = p.run(out);
      changed.push(p.name);
      report(`  + ${tag}: ${p.note}`);
    }
  } catch (err) {
    report(`  ! ${tag}: failed — ${err.message}`);
    if (!p.optional) hardFailure = true;
  }
}

if (notApplicable.length > 0) {
  report(`  ~ not applicable to this bundle (${notApplicable.length}): ${notApplicable.join(", ")}`);
}

if (changed.length > 0) {
  const backup = `${target}.bak-prepatch`;
  try {
    await stat(backup);
  } catch {
    await copyFile(target, backup);
  }
  try {
    await writeFile(target, out, "utf-8");
    report(`wrote ${changed.length} patch(es)`);
  } catch (err) {
    console.error(`apply.mjs: write failed — ${err.message}`);
    process.exit(1);
  }
} else {
  report("no changes needed");
}

if (hardFailure) {
  report("one or more required patches could not be applied — see above");
}

try {
  await mkdir(dirname(LOG), { recursive: true });
  await writeFile(LOG, `${new Date().toISOString()}\n${lines.join("\n")}\n`, "utf-8");
} catch {
  /* logging is best-effort */
}

process.exit(0);
