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

# Patch only when the bundle changed since the last successful patch run.
# One stat + one read per render, so this costs nothing on the hot path.
sig() { printf '%s:%s' "$DIST" "$(stat -c '%Y:%s' "$DIST" 2>/dev/null)"; }

if [ "$(cat "$STAMP" 2>/dev/null)" != "$(sig)" ]; then
  if node "$REPO_DIR/patches/apply.mjs" "$DIST" >/dev/null 2>&1; then
    mkdir -p "$(dirname "$STAMP")"
    sig > "$STAMP"
  fi
  # On failure: no stamp written, so it retries next render. The unpatched
  # bundle still runs below, so the statusline keeps working either way.
fi

exec node "$DIST"
