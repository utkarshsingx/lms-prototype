/**
 * Verifies every theme in lib/themes.ts against the contrast floors the design
 * system promises. Run with `npm run check:themes`.
 *
 * Nothing here trusts a claimed ratio: every number is recomputed from the hex
 * values with the WCAG relative-luminance formula.
 */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../lib/themes.ts", import.meta.url), "utf8");

/** Slice a balanced literal starting at the first `open` at or after `from`. */
function sliceBalanced(from, open, close) {
  const start = src.indexOf(open, from);
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced ${open}${close} literal`);
}

/* The registry is TypeScript, so pull the theme objects out by evaluating the
   array literal with the type annotations stripped. Cheap and good enough for
   a check script; a parse failure fails loudly rather than silently passing. */
function loadThemes() {
  const start = src.indexOf("export const themes: Theme[] = [");
  if (start === -1) throw new Error("could not find the themes array");
  // Anchor on the "= [" so the "[" inside the Theme[] annotation is skipped.
  const literal = sliceBalanced(src.indexOf("= [", start), "[", "]");
  const radiusStart = src.indexOf("export const RADIUS");
  if (radiusStart === -1) throw new Error("could not find RADIUS");
  const radiusLiteral = sliceBalanced(src.indexOf("= {", radiusStart), "{", "}");
  const fn = new Function(`const RADIUS = ${radiusLiteral}; return ${literal};`);
  return fn();
}

function loadTokenNames() {
  const start = src.indexOf("export const TOKENS = [");
  if (start === -1) throw new Error("could not find TOKENS");
  const literal = sliceBalanced(start, "[", "]").replace(/\/\*[\s\S]*?\*\//g, "");
  return new Function(`return ${literal};`)();
}

function loadDefaultTheme() {
  const m = src.match(/export const DEFAULT_THEME = "([^"]+)"/);
  if (!m) throw new Error("could not find DEFAULT_THEME");
  return m[1];
}

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function luminance(hex) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`bad hex: ${hex}`);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/* fg token, bg token, floor, what it is for */
const CHECKS = [
  ["ink", "paper", 12, "long-form reading"],
  ["ink", "surface", 12, "headings on cards"],
  ["ink-2", "surface", 7, "body text"],
  ["ink-3", "surface", 4.5, "metadata"],
  ["ink-3", "surface-2", 4.5, "metadata on raised panels"],
  // Sidebar count badges and the avatar overflow chip put ink-2 on surface-3.
  ["ink-2", "surface-3", 4.5, "counts on inset chips"],
  // Only the disabled send button; WCAG exempts disabled controls, so this is
  // tracked at a lower floor rather than held to 4.5.
  ["ink-3", "surface-3", 3, "disabled control label"],
  ["on-brand", "brand", 4.5, "brand fill label"],
  ["on-accent", "jade", 4.5, "label on a success fill"],
  ["on-accent", "rose", 4.5, "label on a danger fill"],
  ["ink-inv", "surface-inv", 12, "inverse button label, hero band figures"],
  ["brand", "brand-soft", 4.5, "brand text on its tint"],
  ["brand", "surface", 4.5, "links"],
  ["jade", "jade-soft", 4.5, "success text on its tint"],
  ["ember", "ember-soft", 4.5, "live text on its tint"],
  ["amber", "amber-soft", 4.5, "caution text on its tint"],
  ["rose", "rose-soft", 4.5, "danger text on its tint"],
  ["violet", "violet-soft", 4.5, "assistant text on its tint"],
  ["info", "info-soft", 4.5, "info text on its tint"],
  ["info", "surface", 4.5, "info text on a card"],
  // The primary button: its label sits on both ends of the gradient.
  ["cta-ink", "cta", 4.5, "primary button label"],
  ["cta-ink", "cta-strong", 4.5, "primary button label on the gradient's far end"],
  ["ink", "cta-soft", 7, "text on the hover wash and selected chips"],
  ["nav-active-ink", "nav-active", 7, "active nav label"],
  ["nav-active-icon", "nav-active", 3, "active nav icon"],
];

/* Surfaces must be distinguishable from each other, but not stripey. */
const SEPARATION = [
  ["surface", "paper", 1.01, 1.9],
  ["surface-2", "surface", 1.01, 1.9],
  ["surface-3", "surface-2", 1.01, 2.2],
  ["line", "surface", 1.05, 3.2],
];

const themes = loadThemes();
const tokenNames = loadTokenNames();
const defaultTheme = loadDefaultTheme();
let failures = 0;
let checked = 0;

/* Registry-level invariants. */
const registry = [];
checked++;
if (themes[0]?.id !== defaultTheme) {
  registry.push(`default theme "${defaultTheme}" must be first, found "${themes[0]?.id}"`);
}
checked++;
const ids = themes.map((t) => t.id);
if (new Set(ids).size !== ids.length) registry.push(`duplicate theme ids: ${ids.join(", ")}`);
for (const t of themes) {
  checked++;
  const copy = [t.name, t.tagline, t.blurb].join(" ");
  if (/meridian/i.test(copy)) registry.push(`${t.id}: display copy says "Meridian"`);
  checked++;
  if (copy.includes("—")) registry.push(`${t.id}: display copy contains an em dash`);
}
if (registry.length) {
  failures += registry.length;
  console.log("\n✗ registry");
  for (const p of registry) console.log(`    ${p}`);
} else {
  console.log("✓ registry");
}

for (const theme of themes) {
  const problems = [];
  for (const mode of ["light", "dark"]) {
    const t = theme[mode];

    // Every token, in every mode, as a real hex colour.
    checked++;
    const missing = tokenNames.filter((k) => !t[k]);
    if (missing.length) {
      problems.push(`${mode}: missing tokens ${missing.join(", ")}`);
      continue;
    }
    checked++;
    const bad = tokenNames.filter((k) => !HEX.test(t[k]));
    if (bad.length) {
      problems.push(`${mode}: not a hex colour: ${bad.map((k) => `${k}=${t[k]}`).join(", ")}`);
      continue;
    }
    checked++;
    const extra = Object.keys(t).filter((k) => !tokenNames.includes(k));
    if (extra.length) problems.push(`${mode}: unknown tokens ${extra.join(", ")}`);

    for (const [fg, bg, floor, why] of CHECKS) {
      checked++;
      const r = ratio(t[fg], t[bg]);
      if (r < floor) {
        problems.push(
          `${mode}: ${fg} on ${bg} = ${r.toFixed(2)}:1, needs ${floor}:1 (${why})`,
        );
      }
    }
    for (const [a, b, min, max] of SEPARATION) {
      checked++;
      const r = ratio(t[a], t[b]);
      if (r < min) problems.push(`${mode}: ${a} is indistinguishable from ${b} (${r.toFixed(2)}:1)`);
      else if (r > max) problems.push(`${mode}: ${a} vs ${b} is too strong at ${r.toFixed(2)}:1 (max ${max})`);
    }

    // A hand-drawn gradient carries stops that are not tokens; the label has to
    // read on every one of them, at rest and on hover.
    const grad = theme.ctaGradient?.[mode];
    if (grad) {
      for (const state of ["rest", "hover"]) {
        const stops = grad[state].match(/#[0-9a-fA-F]{6}\b/g) ?? [];
        checked++;
        if (stops.length < 2) {
          problems.push(`${mode}: cta gradient ${state} has ${stops.length} hex stops`);
          continue;
        }
        for (const stop of stops) {
          checked++;
          const r = ratio(t["cta-ink"], stop);
          if (r < 4.5) {
            problems.push(
              `${mode}: cta-ink on gradient ${state} stop ${stop} = ${r.toFixed(2)}:1, needs 4.5:1`,
            );
          }
        }
      }
    }
  }

  if (problems.length) {
    failures += problems.length;
    console.log(`\n✗ ${theme.name} (${theme.id})`);
    for (const p of problems) console.log(`    ${p}`);
  } else {
    console.log(`✓ ${theme.name} (${theme.id})`);
  }
}

console.log(
  `\n${themes.length} themes, ${checked} assertions, ${failures} failure${failures === 1 ? "" : "s"}`,
);
process.exit(failures ? 1 : 0);
