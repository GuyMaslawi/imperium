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

/**
 * Staff-only surfaces, the i18n layer itself (whose keys ARE Hebrew), and the
 * one module whose Hebrew is not UI at all.
 *
 * `lib/game/bots.ts` holds the two halves a planted empire's name is built
 * from. That name is written into `Empire.name` and is a **proper noun** from
 * the moment it lands: translating it would rename empires that already exist,
 * and the whole point of a bot is that its name is indistinguishable from a
 * player's. Same reasoning as the stored `Message` rows — see the note in
 * `attackEmpire`.
 */
const SKIP = [
  path.join("src", "app", "admin"),
  path.join("src", "components", "admin"),
  path.join("src", "server", "actions", "admin.ts"),
  // Staff-only despite not being named `admin`: every export sits behind
  // `requireAdmin`, and its strings are refusals shown to an admin plus the
  // summary lines written into the audit log.
  path.join("src", "server", "actions", "impersonation.ts"),
  path.join("src", "server", "adminMonitor.ts"),
  path.join("src", "i18n"),
  path.join("src", "lib", "game", "bots.ts"),
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
 *
 * Comments are blanked line-for-line rather than deleted, so line numbers and
 * the `i18n-exempt` marker below still line up with the source.
 */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

/**
 * Lines a file has declared untranslatable, and why.
 *
 * A handful of Hebrew literals genuinely cannot be rendered per reader, and
 * they are not the same thing as work left undone:
 *
 *  - text written **into a row** that then becomes a fact about the world — a
 *    season's name, a planted empire's name. Translating one would rename
 *    something that already exists under the old name.
 *  - text sent **to one shared place** with many readers and one language — a
 *    Discord announcement lands in a channel, not in a reader's session.
 *
 * Marking one is a claim, so it has to be written down at the line and it is
 * counted separately in the summary. A marker with no reason after it does not
 * count — `// i18n-exempt` alone is a way to hide work, `// i18n-exempt: stored
 * as GameSeason.name` is an argument.
 */
const EXEMPT = /\/\/\s*i18n-exempt:\s*\S|\/\*\s*i18n-exempt:\s*\S/;

/**
 * The block form, for a run of literals that share one reason — a recap
 * assembled at closing time, a wall of operator-side audit text. Opens with
 * `i18n-exempt-start: <reason>` and must be closed with `i18n-exempt-end`;
 * an unclosed region is an error rather than a silent blanket over the rest of
 * the file, which is the only way this could be used to hide work.
 */
const EXEMPT_START = /\/[/*]\s*i18n-exempt-start:\s*\S/;
const EXEMPT_END = /\/[/*]\s*i18n-exempt-end\b/;

function exemptLines(code, file) {
  const lines = code.split("\n");
  const marked = new Set();

  let openedAt = null;
  lines.forEach((line, index) => {
    if (openedAt === null && EXEMPT_START.test(line)) {
      openedAt = index;
      return;
    }
    if (openedAt !== null) {
      marked.add(index + 1);
      if (EXEMPT_END.test(line)) openedAt = null;
    }
  });
  if (openedAt !== null) {
    throw new Error(
      `${file}:${openedAt + 1} opens an i18n-exempt-start region that is never closed`
    );
  }

  lines.forEach((line, index) => {
    if (!EXEMPT.test(line)) return;
    // The marked line itself — a marker may sit at the end of the line it
    // covers — and then the first line of actual code after it, skipping the
    // rest of the comment the reason is written in.
    marked.add(index + 1);
    for (let i = index + 1; i < lines.length; i += 1) {
      const next = lines[i].trim();
      if (next === "" || next.startsWith("//") || next.startsWith("*") || next.startsWith("/*")) {
        continue;
      }
      marked.add(i + 1);
      break;
    }
  });
  return marked;
}

// The dictionary is TypeScript, so its keys are read out of the source text
// rather than by importing it — this script should not need a transpiler, and
// the key set is all it wants.
// Both quote styles: a key that itself contains a double quote — the game has
// several, e.g. 'שדרג את "קבלת מגויסים" לרמה {goal}' — is written in single
// quotes, and reading only the double-quoted form made every one of those look
// untranslated forever.
const translated = new Set();
for (const m of stripComments(
  fs.readFileSync("src/i18n/dictionaries/en.ts", "utf8")
).matchAll(/^\s*(["'])((?:\\.|(?!\1)[^\\])*)\1\s*:/gm)) {
  translated.add(m[2].replace(/\\(["'])/g, "$1"));
}

const files = walk(SRC);

/** Keys actually asked for at runtime: the first argument of every t(...) call. */
const usedKeys = new Set();
/** Hebrew literals NOT inside a t(...) call, by file. */
const unwrapped = new Map();
/** Hebrew literals outside a t(...) call that the dictionary nonetheless covers. */
let dynamic = 0;
/** Literals a line has declared untranslatable, with a reason. */
let exempt = 0;

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const code = stripComments(raw);
  const exempted = exemptLines(raw, file);
  const lineOf = (index) => code.slice(0, index).split("\n").length;

  for (const m of code.matchAll(/\bt\(\s*(["'])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    usedKeys.add(m[2]);
  }

  // Every string literal in the file; a literal is "wrapped" when the call
  // opener sits immediately before it.
  const loose = [];
  for (const m of code.matchAll(/(["'])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const text = m[2];
    if (!HEBREW.test(text)) continue;
    // The window has to clear a wrapped call that prettier broke across lines —
    // `t(\n        "…"` is ordinary formatting for a long string. Widening it is
    // safe because the test still demands *nothing but* whitespace between the
    // call opener and the quote.
    const before = code.slice(Math.max(0, m.index - 80), m.index);
    if (/\bt\(\s*$/.test(before)) continue;
    if (exempted.has(lineOf(m.index))) { exempt++; continue; }
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
    if (!HEBREW.test(m[1])) continue;
    if (exempted.has(lineOf(m.index))) { exempt++; continue; }
    loose.push("`" + m[1].replace(/\s+/g, " ").slice(0, 70) + "`");
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
  declared untranslatable       ${exempt}  (i18n-exempt, with a reason)
  literals still to wrap        ${unwrappedTotal}  in ${unwrapped.size} files
  keys with no literal call     ${stale.length}  (dynamic ones are fine)

  --unwrapped / --missing / --stale to list each.`);
