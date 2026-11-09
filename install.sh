#!/usr/bin/env bash
# Installs this machine's claude-dashboard setup.
#
#   git clone https://github.com/eda-ginger/claude-config.git ~/claude-config
#   bash ~/claude-config/install.sh
#
# Safe to re-run. Existing files are backed up before anything is replaced.

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
CONFIG_LINK="$CLAUDE_DIR/claude-dashboard.local.json"
CONFIG_SRC="$REPO_DIR/dashboard/claude-dashboard.local.json"
SETTINGS="$CLAUDE_DIR/settings.json"
STAMP_SUFFIX="$(date +%Y%m%d-%H%M%S)"

say() { printf '  %s\n' "$1"; }

echo "claude-config install"
echo "  repo: $REPO_DIR"

if [ ! -d "$CLAUDE_DIR" ]; then
  echo "error: $CLAUDE_DIR not found — run Claude Code once first." >&2
  exit 1
fi

# 1. dashboard config -> symlink into the repo
if [ -L "$CONFIG_LINK" ]; then
  say "config: already a symlink, repointing"
  rm "$CONFIG_LINK"
elif [ -e "$CONFIG_LINK" ]; then
  mv "$CONFIG_LINK" "$CONFIG_LINK.bak-$STAMP_SUFFIX"
  say "config: existing file backed up to $(basename "$CONFIG_LINK").bak-$STAMP_SUFFIX"
fi
ln -s "$CONFIG_SRC" "$CONFIG_LINK"
say "config: $CONFIG_LINK -> $CONFIG_SRC"

# 2. statusLine -> wrapper script (no version pinned)
chmod +x "$REPO_DIR/dashboard/statusline.sh" "$REPO_DIR/dashboard/patches/apply.mjs"
WRAPPER="$REPO_DIR/dashboard/statusline.sh"

python3 - "$SETTINGS" "$WRAPPER" "$STAMP_SUFFIX" <<'PY'
import io, json, os, shutil, sys
path, wrapper, stamp = sys.argv[1], sys.argv[2], sys.argv[3]
settings = {}
if os.path.exists(path):
    shutil.copyfile(path, f"{path}.bak-{stamp}")
    with io.open(path, encoding="utf-8") as fh:
        settings = json.load(fh)
want = {"type": "command", "command": f"bash {wrapper}"}
if settings.get("statusLine") == want:
    print("  statusLine: already set")
else:
    settings["statusLine"] = want
    with io.open(path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(settings, indent=2, ensure_ascii=False) + "\n")
    print(f"  statusLine: set to {want['command']}")
PY

# 3. apply the bundle patches now (the wrapper also does this on demand)
if node "$REPO_DIR/dashboard/patches/apply.mjs" 2>/dev/null; then
  :
else
  say "patches: skipped — install the plugin first:"
  say "         /plugin marketplace add uppinote20/claude-dashboard"
  say "         /plugin install claude-dashboard@claude-dashboard"
  say "         then re-run this script (or just start a session)"
fi

echo
echo "done. Start a new session, or check the statusline now with:"
echo "  echo '{\"session_id\":\"t\",\"transcript_path\":\"/tmp/x.jsonl\",\"cwd\":\"'\"\$PWD\"'\",\"model\":{\"id\":\"claude-opus-5\",\"display_name\":\"Opus 5\"},\"workspace\":{\"current_dir\":\"'\"\$PWD\"'\",\"project_dir\":\"'\"\$PWD\"'\"},\"version\":\"2.1.0\"}' | bash $WRAPPER"
