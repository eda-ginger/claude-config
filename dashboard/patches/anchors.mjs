// Patch definitions for the claude-dashboard statusline bundle.
//
// These mirror vault `04. Resources/tools/claude-dashboard-setup.md` 4-1 … 4-12,
// the customisations that produce the preferred statusline. Upstream ships none
// of them, so without these the bundle renders stock.
//
// Anchors are written against plugin 1.36.0 and verified unique. A bundle that
// already carries a patch reports `=`; one whose anchor never existed (e.g. an
// older bundle patched by hand) reports `~` and is left alone.
//
// Each entry: { name, note, doc, optional, present, anchored, run }

const MARKER = "[local patch: logged-in Claude account]";

// ---------------------------------------------------------------- 4-1 bar

const BAR_BLOCKY =
  '  width: 10,\n' +
  '  filledChar: "\\u2588",\n' +
  '  // █ (full block)\n' +
  '  emptyChar: "\\u2591"\n' +
  '  // ░ (light shade)';

const BAR_THIN =
  '  width: 15,\n' +
  '  filledChar: "\\u25AC",\n' +
  '  // ▬ (medium bar)\n' +
  '  emptyChar: "\\u25AC"\n' +
  '  // ▬ (medium bar)';

const BAR_FN_STOCK =
  'function renderProgressBar(percent, config = DEFAULT_PROGRESS_BAR_CONFIG) {\n' +
  '  const { width, filledChar, emptyChar } = config;\n' +
  '  const clampedPercent = Math.max(0, Math.min(100, percent));\n' +
  '  const filled = Math.round(clampedPercent / 100 * width);\n' +
  '  const empty = width - filled;\n' +
  '  const bar = filledChar.repeat(filled) + emptyChar.repeat(empty);\n' +
  '  const color = getColorForPercent(clampedPercent);\n' +
  '  return `${color}${bar}${RESET}`;\n' +
  '}';

// Accepts a colour string in place of a config, and paints the empty run in
// theme.barEmpty so the trailing bar reads as a track rather than as usage.
const BAR_FN_CUSTOM =
  'function renderProgressBar(percent, configOrColor = DEFAULT_PROGRESS_BAR_CONFIG) {\n' +
  '  const config = typeof configOrColor === "string" ? DEFAULT_PROGRESS_BAR_CONFIG : configOrColor;\n' +
  '  const customColor = typeof configOrColor === "string" ? configOrColor : null;\n' +
  '  const { width, filledChar, emptyChar } = config;\n' +
  '  const clampedPercent = Math.max(0, Math.min(100, percent));\n' +
  '  const filled = Math.round(clampedPercent / 100 * width);\n' +
  '  const empty = width - filled;\n' +
  '  const theme = getTheme();\n' +
  '  const color = customColor || getColorForPercent(clampedPercent);\n' +
  '  const filledBar = `${color}${filledChar.repeat(filled)}${RESET}`;\n' +
  '  const emptyBar = `${theme.barEmpty}${emptyChar.repeat(empty)}${RESET}`;\n' +
  '  return filledBar + emptyBar;\n' +
  '}';

// ---------------------------------------------------------------- 4-2 theme

const THEME_MODEL_STOCK =
  '  default: {\n' +
  '    dim: "\\x1B[2m",\n' +
  '    bold: "\\x1B[1m",\n' +
  '    model: "\\x1B[38;5;117m",\n' +
  '    // pastelCyan';

const THEME_MODEL_CUSTOM =
  '  default: {\n' +
  '    dim: "\\x1B[2m",\n' +
  '    bold: "\\x1B[1m",\n' +
  '    model: "\\x1B[38;5;216m",\n' +
  '    // pastelOrange (local patch 4-2)';

const THEME_BAREMPTY_STOCK =
  '    barFilled: "\\x1B[32m",\n' +
  '    // green\n' +
  '    barEmpty: "\\x1B[90m",\n' +
  '    // gray\n' +
  '    red: "\\x1B[31m",';

const THEME_BAREMPTY_CUSTOM =
  '    barFilled: "\\x1B[32m",\n' +
  '    // green\n' +
  '    barEmpty: "\\x1B[38;5;238m",\n' +
  '    // dark gray (local patch 4-2)\n' +
  '    red: "\\x1B[31m",';

// ---------------------------------------------------------------- 4-3 todayCost

const TODAYCOST_STOCK =
  '    return colorize(`${ICON.moneyBag} ${t.widgets.todayCost}: ${formatCost(data.dailyTotal)}`, getTheme().secondary);';

const TODAYCOST_CUSTOM =
  '    return colorize(`\\u{1F3A7} Daily Usage`, getTheme().secondary);';

// ---------------------------------------------------------------- 4-4 context

const CONTEXT_STOCK =
  '    return [renderBar(data), renderPercentage(data), renderUsage(data)].join(getSeparator());';

const CONTEXT_CUSTOM =
  '    const percentColor = getColorForPercent(data.percentage);\n' +
  '    const pctStr = `${data.percentage}%`;\n' +
  '    const padPct = pctStr.padStart(4);\n' +
  '    const tokenStr = `(${formatTokens(data.inputTokens)}/${formatTokens(data.contextSize)})`;\n' +
  '    const padToken = colorize(tokenStr.padEnd(12), getTheme().barEmpty);\n' +
  '    return `${colorize("Ctx", getTheme().danger)} ${renderProgressBar(data.percentage, getTheme().danger)} ${colorize(padPct, percentColor)} ${padToken}`;';

// ---------------------------------------------------------------- 4-5 rateLimit

const RATELIMIT_STOCK =
  'function renderRateLimit(data, ctx, labelKey) {\n' +
  '  if (data.isError) {\n' +
  '    return colorize(ICON.warning, getTheme().warning);\n' +
  '  }\n' +
  '  const { translations: t } = ctx;\n' +
  '  const color = getColorForPercent(data.utilization);\n' +
  '  const label = `${t.labels[labelKey]}: ${colorize(`${data.utilization}%`, color)}`;\n' +
  '  if (!data.resetsAt)\n' +
  '    return label;\n' +
  '  return `${label} (${formatTimeRemaining(data.resetsAt, t)})`;\n' +
  '}';

const RATELIMIT_CUSTOM =
  'function renderRateLimit(data, ctx, labelKey, barColor) {\n' +
  '  if (data.isError) {\n' +
  '    return colorize(ICON.warning, getTheme().warning);\n' +
  '  }\n' +
  '  const { translations: t } = ctx;\n' +
  '  const color = getColorForPercent(data.utilization);\n' +
  '  const bar = barColor ? renderProgressBar(data.utilization, barColor) : renderProgressBar(data.utilization);\n' +
  '  const pctStr = `${data.utilization}%`;\n' +
  '  const padPct = pctStr.padStart(4);\n' +
  '  const timeStr = data.resetsAt ? `(${formatTimeRemaining(data.resetsAt, t)})` : "";\n' +
  '  const padTime = colorize(timeStr.padEnd(12), getTheme().barEmpty);\n' +
  '  const labelColor = barColor || getColorForPercent(data.utilization);\n' +
  '  return `${colorize(t.labels[labelKey], labelColor)} ${bar} ${colorize(padPct, color)} ${padTime}`;\n' +
  '}';

const R5H_STOCK = '  render(data, ctx) {\n    return renderRateLimit(data, ctx, "5h");\n  }';
const R5H_CUSTOM = '  render(data, ctx) {\n    return renderRateLimit(data, ctx, "5h", getTheme().info);\n  }';

const R7D_STOCK = '  render(data, ctx) {\n    return renderRateLimit(data, ctx, "7d_all");\n  }';
const R7D_CUSTOM =
  '  render(data, ctx) {\n' +
  '    return colorize("\\u{1F4C5} 7days Usage", getTheme().secondary) + getSeparator() + renderRateLimit(data, ctx, "7d_all", getTheme().safe);\n' +
  '  }';

const R7DS_STOCK = '  render(data, ctx) {\n    return renderRateLimit(data, ctx, "7d_sonnet");';
const R7DS_CUSTOM = '  render(data, ctx) {\n    return renderRateLimit(data, ctx, "7d_sonnet", getTheme().safe);';

// ---------------------------------------------------------------- 4-6 labels

const LABELS_STOCK = '    "7d_all": "7d",\n    "7d_sonnet": "7d-S",';
const LABELS_CUSTOM = '    "7d_all": "All",\n    "7d_sonnet": "Sn",';

// ---------------------------------------------------------------- 4-7 model

const MODEL_STOCK =
  '  render(data) {\n' +
  '    const { family, version } = parseModelName(data.displayName);\n' +
  '    const name = version ? `${family} ${version}` : family;\n' +
  '    const icon = isZaiProvider() ? ICON.orangeCircle : "\\u25C6";\n' +
  '    const supportsEffort = family === "Opus" || family === "Sonnet" || family === "Fable";\n' +
  '    const effortSuffix = supportsEffort ? `(${EFFORT_BADGE[data.effortLevel]})` : "";\n' +
  '    const fastIndicator = family === "Opus" && data.fastMode ? " \\u21AF" : "";\n' +
  '    return `${getTheme().model}${icon} ${name}${effortSuffix}${fastIndicator}${RESET}`;\n' +
  '  }';

// Drops the effort badge and uses 🔥. Version comes from the model id by regex
// rather than the hardcoded table the original 4-7 used, so new families work.
const MODEL_CUSTOM =
  '  render(data) {\n' +
  '    const { family, version: parsedVersion } = parseModelName(data.displayName);\n' +
  '    const idMatch = (data.id || "").match(/(?:opus|sonnet|haiku|fable)-(\\d+)(?:-(\\d{1,2}))?(?!\\d)/);\n' +
  '    const idVersion = idMatch ? (idMatch[2] ? `${idMatch[1]}.${idMatch[2]}` : idMatch[1]) : "";\n' +
  '    const version = idVersion || parsedVersion || "";\n' +
  '    const name = version ? `${family} ${version}` : family;\n' +
  '    const icon = isZaiProvider() ? ICON.orangeCircle : "\\u{1F525}";\n' +
  '    const fastIndicator = family === "Opus" && data.fastMode ? " \\u21AF" : "";\n' +
  '    return `${getTheme().model}${icon} ${name}${fastIndicator}${RESET}`;\n' +
  '  }';

// ---------------------------------------------------------------- 4-8 version

const VERSION_STOCK = '    return colorize(`v${data.version}`, getTheme().dim);';
const VERSION_CUSTOM = '    return colorize(`Claude v${data.version}`, getTheme().model);';

// ---------------------------------------------------------------- 4-9 counts

const COUNTS_STOCK =
  '  render(data, ctx) {\n' +
  '    const { translations: t } = ctx;\n' +
  '    const parts = [];\n' +
  '    if (data.claudeMd > 0) {\n' +
  '      parts.push(`${t.widgets.claudeMd}: ${data.claudeMd}`);\n' +
  '    }\n' +
  '    if (data.agentsMd > 0) {\n' +
  '      parts.push(`${t.widgets.agentsMd}: ${data.agentsMd}`);\n' +
  '    }\n' +
  '    if (data.rules > 0) {\n' +
  '      parts.push(`${t.widgets.rules}: ${data.rules}`);\n' +
  '    }\n' +
  '    if (data.mcps > 0) {\n' +
  '      parts.push(`${t.widgets.mcps}: ${data.mcps}`);\n' +
  '    }\n' +
  '    if (data.hooks > 0) {\n' +
  '      parts.push(`${t.widgets.hooks}: ${data.hooks}`);\n' +
  '    }\n' +
  '    if (data.addedDirs > 0) {\n' +
  '      parts.push(`${t.widgets.addedDirs}: ${data.addedDirs}`);\n' +
  '    }\n' +
  '    return colorize(parts.join(", "), getTheme().secondary);\n' +
  '  }';

// Count first ("1 CLAUDE.md"), MCP and Hooks always shown, pipe-separated.
const COUNTS_CUSTOM =
  '  render(data, ctx) {\n' +
  '    const { translations: t } = ctx;\n' +
  '    const parts = [];\n' +
  '    parts.push(`${data.claudeMd} ${t.widgets.claudeMd}`);\n' +
  '    if (data.agentsMd > 0) {\n' +
  '      parts.push(`${data.agentsMd} ${t.widgets.agentsMd}`);\n' +
  '    }\n' +
  '    if (data.rules > 0) {\n' +
  '      parts.push(`${data.rules} ${t.widgets.rules}`);\n' +
  '    }\n' +
  '    parts.push(`${data.mcps} ${t.widgets.mcps}`);\n' +
  '    parts.push(`${data.hooks} ${t.widgets.hooks}`);\n' +
  '    if (data.addedDirs > 0) {\n' +
  '      parts.push(`${data.addedDirs} ${t.widgets.addedDirs}`);\n' +
  '    }\n' +
  '    return parts.map((p) => colorize(p, getTheme().secondary)).join(getSeparator());\n' +
  '  }';

// `claude mcp list` is the only way to see built-in/plugin MCPs, but it dials
// every server and takes 8s+. Never call it synchronously: cache on disk and
// refresh in a detached child. See the 2026-10-28 note in the vault doc.
const MCP_STOCK = '  return counts.reduce((a, b) => a + b, 0);\n}\nvar configCountsWidget = {';

const MCP_CUSTOM =
  '  const fileCount = counts.reduce((a, b) => a + b, 0);\n' +
  '  try {\n' +
  '    const { readFile: _rf, writeFile: _wf, mkdir: _mk } = await import("node:fs/promises");\n' +
  '    const home = process.env.HOME || "";\n' +
  '    const cacheDir = `${home}/.cache/claude-dashboard`;\n' +
  '    const cacheFile = `${cacheDir}/mcp-count.json`;\n' +
  '    const TTL = 10 * 60 * 1e3;\n' +
  '    const LOCK = 60 * 1e3;\n' +
  '    let cached = null;\n' +
  '    try {\n' +
  '      cached = JSON.parse(await _rf(cacheFile, "utf-8"));\n' +
  '    } catch {\n' +
  '    }\n' +
  '    const cachedCount = typeof cached?.count === "number" ? cached.count : 0;\n' +
  '    const fresh = cached && Date.now() - (cached.timestamp || 0) < TTL;\n' +
  '    const refreshing = cached && Date.now() - (cached.refreshStartedAt || 0) < LOCK;\n' +
  '    if (!fresh && !refreshing) {\n' +
  '      const { spawn: _spawn } = await import("node:child_process");\n' +
  '      await _mk(cacheDir, { recursive: true });\n' +
  '      await _wf(cacheFile, JSON.stringify({ ...cached || {}, refreshStartedAt: Date.now() }));\n' +
  '      const script = `n=$(claude mcp list 2>/dev/null | grep -c Connected); printf \'{"count":%s,"timestamp":%s}\' "$n" "$(date +%s)000" > "${cacheFile}"`;\n' +
  '      _spawn("bash", ["-c", script], { detached: true, stdio: "ignore" }).unref();\n' +
  '    }\n' +
  '    return cachedCount > fileCount ? cachedCount : fileCount;\n' +
  '  } catch {\n' +
  '    return fileCount;\n' +
  '  }\n' +
  '}\nvar configCountsWidget = {';

// ---------------------------------------------------------------- 4-9b git

const GIT_TIMEOUT_STOCK = 'execGit(["status", "--porcelain"], cwd, 1e3)';
const GIT_TIMEOUT_CUSTOM = 'execGit(["status", "--porcelain"], cwd, 300)';

// ---------------------------------------------------------------- 4-10 time

const TIME_STOCK = '`${days}${t.time.days}${hours}${t.time.hours}`';
const TIME_CUSTOM = '`${days}${t.time.days} ${hours}${t.time.hours}`';

const TIME2_STOCK = '`${hours}${t.time.hours}${minutes}${t.time.minutes}`';
const TIME2_CUSTOM = '`${hours}${t.time.hours} ${minutes}${t.time.minutes}`';

// ---------------------------------------------------------------- 4-11 sep

const SEP_STOCK = '` ${getTheme().dim}${char}${RESET} `';
const SEP_CUSTOM = '` ${getTheme().barEmpty}${char}${RESET} `';

// ---------------------------------------------------------------- 4-12 spacer

const FORMAT_OUTPUT_STOCK =
  'async function formatOutput(ctx) {\n' +
  '  const lines = await renderAllLines(ctx);\n' +
  '  return lines.join("\\n");\n' +
  '}';

const FORMAT_OUTPUT_CUSTOM =
  'async function formatOutput(ctx) {\n' +
  '  const lines = await renderAllLines(ctx);\n' +
  '  const spacerAfter = ctx.config.spacerAfterLine ?? [];\n' +
  '  const result = [];\n' +
  '  for (let i = 0; i < lines.length; i++) {\n' +
  '    result.push(lines[i]);\n' +
  '    if (spacerAfter.includes(i)) {\n' +
  '      result.push("\\u200B");\n' +
  '    }\n' +
  '  }\n' +
  '  return result.join("\\n");\n' +
  '}';

// ---------------------------------------------------------------- folder icon

// 1.36.0 introduced an ICON table that appends a variation selector (U+FE0F)
// to every emoji. The folder glyph is the only one visible in this layout, and
// the selector shifts its width in some terminals, so drop it to match 1.25.x.
const FOLDER_ICON_STOCK = '  folder: "\\u{1F4C1}\\uFE0F",';
const FOLDER_ICON_CUSTOM = '  folder: "\\u{1F4C1}",';

// ------------------------------------------------------- account widget (new)

const REGISTRY_ANCHOR = "var widgetRegistry = /* @__PURE__ */ new Map([";
const ENTRY_ANCHOR = '  ["projectInfo", projectInfoWidget],';

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

// --------------------------------------------------------------------------

const simple = (name, doc, note, stock, custom, presentNeedle) => ({
  name,
  doc,
  note,
  optional: true,
  present: (s) => s.includes(presentNeedle ?? custom),
  anchored: (s) => s.includes(stock),
  run: (s) => s.replace(stock, custom),
});

export const patches = [
  simple("bar-chars", "4-1a", "progress bar ▬ at width 15", BAR_BLOCKY, BAR_THIN),
  simple("bar-empty-color", "4-1b", "paint the empty bar run in theme.barEmpty", BAR_FN_STOCK, BAR_FN_CUSTOM),
  simple("theme-model-color", "4-2a", "default theme model colour → pastel orange", THEME_MODEL_STOCK, THEME_MODEL_CUSTOM),
  simple("theme-barempty-color", "4-2b", "default theme barEmpty → dark gray", THEME_BAREMPTY_STOCK, THEME_BAREMPTY_CUSTOM),
  simple("todaycost-label", "4-3", "todayCost shows 🎧 Daily Usage", TODAYCOST_STOCK, TODAYCOST_CUSTOM),
  simple("context-render", "4-4", "context gets a Ctx label and a red bar", CONTEXT_STOCK, CONTEXT_CUSTOM),
  simple("ratelimit-render", "4-5a", "rate limits render as labelled bars", RATELIMIT_STOCK, RATELIMIT_CUSTOM),
  simple("ratelimit-5h-color", "4-5b", "5h bar in info colour", R5H_STOCK, R5H_CUSTOM),
  simple("ratelimit-7d-label", "4-5c", "7d gets the 📅 7days Usage prefix", R7D_STOCK, R7D_CUSTOM),
  simple("ratelimit-7ds-color", "4-5d", "7d-sonnet bar in safe colour", R7DS_STOCK, R7DS_CUSTOM),
  simple("en-labels", "4-6", "English labels All / Sn", LABELS_STOCK, LABELS_CUSTOM),
  simple("model-render", "4-7", "🔥 icon, no effort badge, version from model id", MODEL_STOCK, MODEL_CUSTOM),
  simple("version-render", "4-8", 'version shows "Claude v…" in model colour', VERSION_STOCK, VERSION_CUSTOM),
  simple("configcounts-render", "4-9a", "counts first, MCP/Hooks always shown", COUNTS_STOCK, COUNTS_CUSTOM),
  simple("countmcps-cache", "4-9b", "include built-in MCPs via a cached background `claude mcp list`", MCP_STOCK, MCP_CUSTOM, "mcp-count.json"),
  simple("git-status-timeout", "4-9c", "isGitDirty timeout 1s → 300ms for DriveFS repos", GIT_TIMEOUT_STOCK, GIT_TIMEOUT_CUSTOM),
  simple("time-format-days", "4-10a", "space between day and hour", TIME_STOCK, TIME_CUSTOM),
  simple("time-format-hours", "4-10b", "space between hour and minute", TIME2_STOCK, TIME2_CUSTOM),
  simple("separator-color", "4-11", "separator in barEmpty colour", SEP_STOCK, SEP_CUSTOM),
  simple("spacer-after-line", "4-12", "support the spacerAfterLine config key", FORMAT_OUTPUT_STOCK, FORMAT_OUTPUT_CUSTOM, "spacerAfterLine"),
  simple("folder-icon", "4-13", "drop the U+FE0F variation selector from 📁", FOLDER_ICON_STOCK, FOLDER_ICON_CUSTOM),
  {
    name: "account-widget",
    doc: "new",
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
