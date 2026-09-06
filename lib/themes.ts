/**
 * Theme registry — one source of truth for every palette in the product.
 *
 * A theme changes the whole system: surfaces, ink, accents, type and radius, in
 * both light and dark. The CSS is generated from this file at build time by
 * `themeCss()` and injected in <head>, so the picker UI and the stylesheet can
 * never drift apart.
 *
 * Selector strategy: `html[data-theme="x"]` (specificity 0,1,1) outranks the
 * `:root` defaults in globals.css (0,1,0), and `html[data-theme="x"].dark`
 * (0,2,1) outranks the plain `.dark` block, so ordering never matters.
 */

export const TOKENS = [
  "paper",
  "surface",
  "surface-2",
  "surface-3",
  "surface-inv",
  "line",
  "line-strong",
  "ink",
  "ink-2",
  "ink-3",
  "ink-inv",
  "brand",
  "brand-hover",
  "brand-soft",
  "brand-line",
  "on-brand",
  "jade",
  "jade-soft",
  "ember",
  "ember-soft",
  "amber",
  "amber-soft",
  "rose",
  "rose-soft",
  "violet",
  "violet-soft",
  "on-accent",
] as const;

export type TokenName = (typeof TOKENS)[number];
export type Tokens = Record<TokenName, string>;

export type RadiusScale = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
};

export type Theme = {
  id: string;
  name: string;
  tagline: string;
  /** One sentence for the picker. */
  blurb: string;
  /** CSS variable names produced by next/font in app/layout.tsx. */
  fonts: { display: string; sans: string; mono: string };
  /** Human-readable family names, shown in the picker. */
  faces: { display: string; sans: string; mono: string };
  radius: RadiusScale;
  /** Extra letter-spacing for display type, where the face wants it. */
  displayTracking?: string;
  light: Tokens;
  dark: Tokens;
};

/* ---------------------------------------------------------------- radii */

export const RADIUS: Record<string, RadiusScale> = {
  sharp: {
    xs: "0px",
    sm: "0px",
    md: "1px",
    lg: "2px",
    xl: "2px",
    "2xl": "3px",
  },
  small: {
    xs: "0.1875rem",
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.625rem",
    "2xl": "0.75rem",
  },
  medium: {
    xs: "0.375rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.375rem",
    "2xl": "1.75rem",
  },
  large: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1.125rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "2.5rem",
  },
};

/* --------------------------------------------------------------- themes */

export const themes: Theme[] = [
  {
    id: "meridian",
    name: "Meridian",
    tagline: "Warm paper, electric cobalt",
    blurb:
      "The default. A warm off-white ground with near-black ink and one confident blue, set in a high-contrast serif over Inter.",
    fonts: {
      display: "--ff-instrument-serif",
      sans: "--ff-inter",
      mono: "--ff-jetbrains",
    },
    faces: {
      display: "Instrument Serif",
      sans: "Inter",
      mono: "JetBrains Mono",
    },
    radius: RADIUS.medium,
    light: {
      paper: "#fbfaf8",
      surface: "#ffffff",
      "surface-2": "#f5f3ee",
      "surface-3": "#ebe7de",
      "surface-inv": "#14161b",
      line: "#e7e2d8",
      "line-strong": "#d4cec1",
      ink: "#111317",
      "ink-2": "#4c535d",
      "ink-3": "#676e7a",
      "ink-inv": "#f7f6f3",
      brand: "#2d5bff",
      "brand-hover": "#1e42d0",
      "brand-soft": "#ecf0ff",
      "brand-line": "#c3cffe",
      "on-brand": "#ffffff",
      jade: "#0f7a5a",
      "jade-soft": "#e1f2ec",
      ember: "#b64606",
      "ember-soft": "#fceee3",
      amber: "#8a5a00",
      "amber-soft": "#faf0d9",
      rose: "#bd2f48",
      "rose-soft": "#fbe8eb",
      violet: "#6a37cf",
      "violet-soft": "#efe9fc",
      "on-accent": "#ffffff",
    },
    dark: {
      paper: "#0a0b0e",
      surface: "#121419",
      "surface-2": "#191c22",
      "surface-3": "#21252d",
      "surface-inv": "#f3f2ef",
      line: "#24282f",
      "line-strong": "#363b45",
      ink: "#f2f1ee",
      "ink-2": "#a5acb7",
      "ink-3": "#828994",
      "ink-inv": "#14161b",
      brand: "#7093ff",
      "brand-hover": "#8aa6ff",
      "brand-soft": "#161d33",
      "brand-line": "#29334f",
      "on-brand": "#0a0f22",
      jade: "#45b892",
      "jade-soft": "#10231d",
      ember: "#f0803c",
      "ember-soft": "#26170f",
      amber: "#d8a238",
      "amber-soft": "#221a0c",
      rose: "#ef6a80",
      "rose-soft": "#261216",
      violet: "#a281f0",
      "violet-soft": "#1b1530",
      "on-accent": "#0b0d10",
    },
  },
];

export const DEFAULT_THEME = "meridian";

export const themeById = (id: string) =>
  themes.find((t) => t.id === id) ?? themes[0];

/* ------------------------------------------------------------ generation */

function block(selector: string, decls: string[]) {
  return `${selector}{${decls.join("")}}`;
}

function tokenDecls(tokens: Tokens) {
  return TOKENS.map((t) => `--${t}:${tokens[t]};`);
}

/**
 * Surfaces that are dark by nature — video chrome, code blocks, the marketing
 * showcase panels — must not flip to white in dark mode, but should still
 * change with the theme. They borrow the theme's own dark palette and stay
 * constant across modes.
 */
function stageDecls(theme: Theme) {
  const d = theme.dark;
  return [
    `--stage:${d.paper};`,
    `--stage-2:${d["surface-2"]};`,
    `--stage-3:${d["surface-3"]};`,
    `--stage-ink:${d.ink};`,
    `--stage-ink-2:${d["ink-2"]};`,
    `--stage-ink-3:${d["ink-3"]};`,
    `--stage-line:${d.line};`,
    `--stage-line-strong:${d["line-strong"]};`,
    `--stage-brand:${d.brand};`,
    `--stage-brand-soft:${d["brand-soft"]};`,
    `--stage-jade:${d.jade};`,
    `--stage-ember:${d.ember};`,
    `--stage-amber:${d.amber};`,
    `--stage-rose:${d.rose};`,
    `--stage-violet:${d.violet};`,
  ];
}

function shellDecls(theme: Theme) {
  const r = theme.radius;
  return [
    `--stack-display:var(${theme.fonts.display}),ui-serif,Georgia,serif;`,
    `--stack-sans:var(${theme.fonts.sans}),ui-sans-serif,system-ui,sans-serif;`,
    `--stack-mono:var(${theme.fonts.mono}),ui-monospace,SFMono-Regular,monospace;`,
    `--display-tracking:${theme.displayTracking ?? "-0.02em"};`,
    `--r-xs:${r.xs};`,
    `--r-sm:${r.sm};`,
    `--r-md:${r.md};`,
    `--r-lg:${r.lg};`,
    `--r-xl:${r.xl};`,
    `--r-2xl:${r["2xl"]};`,
  ];
}

/**
 * The complete stylesheet for every theme. Rendered once into <head> by the
 * root layout, so it is static HTML and costs no runtime work.
 */
export function themeCss() {
  return themes
    .map((t) =>
      [
        block(`html[data-theme="${t.id}"]`, [
          ...shellDecls(t),
          ...stageDecls(t),
          ...tokenDecls(t.light),
          "color-scheme:light;",
        ]),
        block(`html[data-theme="${t.id}"].dark`, [
          ...tokenDecls(t.dark),
          "color-scheme:dark;",
        ]),
      ].join(""),
    )
    .join("");
}

/** Swatch shown on the picker chip: ground, ink, brand, and two accents. */
export function swatch(theme: Theme, mode: "light" | "dark" = "light") {
  const t = mode === "dark" ? theme.dark : theme.light;
  return [t.paper, t.ink, t.brand, t.jade, t.ember];
}
