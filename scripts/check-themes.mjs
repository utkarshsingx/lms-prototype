/**
 * Verifies every theme in lib/themes.ts against the contrast floors the design
 * system promises. Run with `npm run check:themes`.
 *
 * Nothing here trusts a claimed ratio: every number is recomputed from the hex
 * values with the WCAG relative-luminance formula.
 */
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../lib/themes.ts", import.meta.url), "utf8");

/* The registry is TypeScript, so pull the theme objects out by evaluating the
   array literal with the type annotations stripped. Cheap and good enough for
   a check script; a parse failure fails loudly rather than silently passing. */
function loadThemes() {
  const start = src.indexOf("export const themes: Theme[] = [");
  if (start === -1) throw new Error("could not find the themes array");
  // Anchor on the "= [" so the "[" inside the Theme[] annotation is skipped.
  const from = src.indexOf("= [", start) + 2;
  let depth = 0;
  let end = -1;
  for (let i = from; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error("unbalanced themes array");
  const literal = src.slice(from, end);
  const radiusStart = src.indexOf("export const RADIUS");
  const radiusFrom = src.indexOf("{", radiusStart);
  let rd = 0;
  let radiusEnd = -1;
  for (let i = radiusFrom; i < src.length; i++) {
    if (src[i] === "{") rd++;
    else if (src[i] === "}") {
      rd--;
      if (rd === 0) {
        radiusEnd = i + 1;
        break;
      }
    }
  }
  const radiusLiteral = src
    .slice(radiusFrom, radiusEnd)
    .replace(/Record<[^>]*>/g, "");
  const fn = new Function(
    `const RADIUS = ${radiusLiteral}; return ${literal};`,
  );
  return fn();
}

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

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
  ["on-brand", "brand", 4.5, "primary button label"],
  ["on-accent", "jade", 4.5, "label on a success fill"],
  ["on-accent", "rose", 4.5, "label on a danger fill"],
  ["ink-inv", "surface-inv", 12, "inverse button label"],
  ["brand", "brand-soft", 4.5, "brand text on its tint"],
  ["brand", "surface", 4.5, "links"],
  ["jade", "jade-soft", 4.5, "success text on its tint"],
  ["ember", "ember-soft", 4.5, "live text on its tint"],
  ["amber", "amber-soft", 4.5, "caution text on its tint"],
  ["rose", "rose-soft", 4.5, "danger text on its tint"],
  ["violet", "violet-soft", 4.5, "assistant text on its tint"],
];

/* Surfaces must be distinguishable from each other, but not stripey. */
const SEPARATION = [
  ["surface", "paper", 1.01, 1.9],
  ["surface-2", "surface", 1.01, 1.9],
  ["surface-3", "surface-2", 1.01, 2.2],
  ["line", "surface", 1.05, 3.2],
];

const themes = loadThemes();
let failures = 0;
let checked = 0;

for (const theme of themes) {
  const problems = [];
  for (const mode of ["light", "dark"]) {
    const t = theme[mode];
    const missing = [];
    for (const [fg, bg] of CHECKS) {
      if (!t[fg]) missing.push(fg);
      if (!t[bg]) missing.push(bg);
    }
    if (missing.length) {
      problems.push(`${mode}: missing tokens ${[...new Set(missing)].join(", ")}`);
      continue;
    }
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
