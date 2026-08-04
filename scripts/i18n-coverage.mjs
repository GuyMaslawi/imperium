/**
 * How much of the site speaks English yet.
 *
 * Two questions, answered separately, because they fail in different ways:
 *
 *  1. **Wrapped?** Which Hebrew string literals are still rendered directly
 *     instead of through `t()`. These cannot be translated at all — no
 *     dictionary entry can reach them.
 *  2. **Translated?** Which `t("…")` keys have no entry in the English
 *     dictionary. These fall back to Hebrew, which is by design (see
 *     src/i18n/translate.ts) but is still untranslated text on screen.
 *
 * It also flags the reverse: dictionary entries whose key appears in no literal
 * `t("…")` call. Usually that is copy that drifted — a changed punctuation mark
 * in the Hebrew, a reworded sentence — which is invisible on screen precisely
 * because the fallback is silent.
 *
 * Read that list with one caveat: a key reached *dynamically* lands there too.
 * `t(meta.label)` and `t(weapon.name)` translate data defined in
 * `lib/game/*`, so their keys are real and working even though no literal call
 * spells them out. Check a flagged key against the data modules before deleting
 * it.
 *
 *   node scripts/i18n-coverage.mjs            # summary
 *   node scripts/i18n-coverage.mjs --unwrapped   # every literal still to wrap
 *   node scripts/i18n-coverage.mjs --missing     # every key still to translate
 *   node scripts/i18n-coverage.mjs --stale       # dictionary keys nothing uses
 *
 * The admin control centre is excluded throughout: it is staff-only and stays
 * Hebrew on purpose.
 */
import fs from "node:fs";
import path from "node:path";

const SRC = "src";
const HEBREW = /[\u0590-\u05FF]/;

/** Staff-only surfaces, and the i18n layer itself (whose keys ARE Hebrew). */
const SKIP = [
  path.join("src", "app", "admin"),
  path.join("src", "components", "admin"),
  path.join("src", "server", "actions", "admin.ts"),
  path.join("src", "server", "adminMonitor.ts"),
  path.join("src", "i18n"),
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (SKIP.some((s) => full.startsWith(s))) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Strip comments before scanning. Every file in this codebase carries long
 * prose comments, many of them quoting the Hebrew they describe — counting
 * those as untranslated UI would make the report useless.
 */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// The dictionary is TypeScript, so its keys are read out of the source text
// rather than by importing it — this script should not need a transpiler, and
// the key set is all it wants.
const translated = new Set();
for (const m of stripComments(
  fs.readFileSync("src/i18n/dictionaries/en.ts", "utf8")
).matchAll(/^\s*"((?:\\.|[^"\\])*)":/gm)) {
  translated.add(m[1].replace(/\\"/g, '"'));
}

const files = walk(SRC);

/** Keys actually asked for at runtime: the first argument of every t(...) call. */
const usedKeys = new Set();
/** Hebrew literals NOT inside a t(...) call, by file. */
const unwrapped = new Map();
/** Hebrew literals outside a t(...) call that the dictionary nonetheless covers. */
let dynamic = 0;

for (const file of files) {
  const code = stripComments(fs.readFileSync(file, "utf8"));

  for (const m of code.matchAll(/\bt\(\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    usedKeys.add(m[2]);
  }

  // Every string literal in the file; a literal is "wrapped" when the call
  // opener sits immediately before it.
  const loose = [];
  for (const m of code.matchAll(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const text = m[2];
    if (!HEBREW.test(text)) continue;
    const before = code.slice(Math.max(0, m.index - 12), m.index);
    if (/\bt\(\s*$/.test(before)) continue;
    // A literal that already has a dictionary entry is reached *dynamically* —
    // `t(weapon.name)` over a name defined in lib/game/weapons.ts. It is
    // translated; it just isn't spelled out at a call site. Counting those as
    // outstanding work would make lib/game/* look untouched when it is done.
    if (translated.has(text)) { dynamic++; continue; }
    loose.push(text);
  }
  // Template literals carrying Hebrew: these cannot be translated at all
  // without first being turned into a `{placeholder}` string.
  for (const m of code.matchAll(/`((?:\\.|[^`\\])*)`/g)) {
    if (HEBREW.test(m[1])) loose.push("`" + m[1].replace(/\s+/g, " ").slice(0, 70) + "`");
  }
  if (loose.length) unwrapped.set(file, loose);
}

const missing = [...usedKeys].filter((k) => !translated.has(k)).sort();
const stale = [...translated].filter((k) => !usedKeys.has(k)).sort();
const unwrappedTotal = [...unwrapped.values()].reduce((n, l) => n + l.length, 0);

const arg = process.argv[2];
if (arg === "--unwrapped") {
  for (const [file, list] of [...unwrapped].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${file}  (${list.length})`);
    for (const s of list) console.log("   " + s);
  }
} else if (arg === "--missing") {
  for (const k of missing) console.log(k);
} else if (arg === "--stale") {
  for (const k of stale) console.log(k);
}

const wrapped = usedKeys.size;
const done = wrapped - missing.length;
const pct = (n, d) => (d === 0 ? "100" : ((n / d) * 100).toFixed(1));

console.log(`
i18n coverage (admin excluded)
──────────────────────────────
  strings routed through t()    ${wrapped}
    ├─ translated to English    ${done}  (${pct(done, wrapped)}%)
    └─ falling back to Hebrew   ${missing.length}
  data strings reached via t()  ${dynamic}
  literals still to wrap        ${unwrappedTotal}  in ${unwrapped.size} files
  keys with no literal call     ${stale.length}  (dynamic ones are fine)

  --unwrapped / --missing / --stale to list each.`);
