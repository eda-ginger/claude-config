#!/usr/bin/env bash
# claude-dashboard statusline wrapper.
#
# Why this exists: the account widget and the model-version fix are patches to
# the plugin's bundled dist/index.js, so a plugin update wipes them. This
# wrapper resolves whichever version is installed and re-applies the patches
# whenever the bundle changes, so settings.json never pins a version.
#
# Point settings.json at this file:
#   "statusLine": { "type": "command", "command": "bash ~/claude-config/dashboard/statusline.sh" }

set -uo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="$HOME/.claude/plugins/cache/claude-dashboard/claude-dashboard"
STAMP="$HOME/.cache/claude-config/dashboard-patch.stamp"

# Newest installed version (version-sorted, so 1.26.0 beats 1.9.9).
DIST=""
if [ -d "$BASE" ]; then
  while IFS= read -r candidate; do
    [ -f "$candidate" ] && DIST="$candidate"
  done < <(find "$BASE" -mindepth 3 -maxdepth 3 -path '*/dist/index.js' -print 2>/dev/null | sort -V)
fi

if [ -z "$DIST" ]; then
  # Plugin missing: say so instead of printing nothing.
  printf '\033[33m⚠️ claude-dashboard not installed\033[0m\n'
  exit 0
fi

# Patch only when the bundle OR the patch script changed since the last run.
# Including apply.mjs means `git pull` of a fixed patch set takes effect without
# touching anything by hand. Two stats + one small read per render, so this
# costs nothing on the hot path.
APPLY="$REPO_DIR/patches/apply.mjs"
sig() {
  printf '%s:%s:%s' "$DIST" \
    "$(stat -c '%Y:%s' "$DIST" 2>/dev/null)" \
    "$(stat -c '%Y:%s' "$APPLY" 2>/dev/null)"
}

if [ "$(cat "$STAMP" 2>/dev/null)" != "$(sig)" ]; then
  if node "$APPLY" "$DIST" >/dev/null 2>&1; then
    mkdir -p "$(dirname "$STAMP")"
    sig > "$STAMP"
  fi
  # apply.mjs exits 0 whenever the bundle is in its best achievable state,
  # including when an anchor is gone. It only fails on unreadable/unwritable
  # files, where retrying next render is the right move. Either way the bundle
  # still runs below, so the statusline never goes blank.
  # What happened last run: ~/.cache/claude-config/last-patch.log
fi

exec node "$DIST"
