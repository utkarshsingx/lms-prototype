/**
 * Theme registry: one source of truth for every palette in the product.
 *
 * A theme changes the whole system: surfaces, ink, accents, type and radius, in
 * both light and dark. The CSS is generated from this file at build time by
 * `themeCss()` and injected in <head>, so the picker UI and the stylesheet can
 * never drift apart.
 *
 * Selector strategy: `html[data-theme="x"]` (specificity 0,1,1) outranks the
 * `:root` defaults in globals.css (0,1,0), and `html[data-theme="x"].dark`
 * (0,2,1) outranks the plain `.dark` block, so ordering never matters.
 *
 * The token values below are literals on purpose: scripts/check-themes.mjs
 * evaluates this array directly and recomputes every contrast ratio from them.
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
  /* Informational blue. Themes whose brand is already blue reuse it. */
  "info",
  "info-soft",
  /* Call to action: a fill (yellow in Prephasz), its gold end, a hover wash
     and the ink that sits on the fill. Other themes derive these from brand. */
  "cta",
  "cta-strong",
  "cta-soft",
  "cta-ink",
  /* The active sidebar pill, its label and its icon. */
  "nav-active",
  "nav-active-ink",
  "nav-active-icon",
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

/** A CTA background at rest and on hover, as full CSS gradient values. */
export type CtaGradient = { rest: string; hover: string };

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
  /**
   * Pills (badges, chips) follow the theme's geometry. Fully round by default;
   * a square-cornered theme sets this so its pills do not look borrowed.
   */
  pill?: string;
  /** Weight for display headings; variable faces can carry their own. */
  displayWeight?: string;
  /** Generic family behind the display face while it loads. Serif by default. */
  displayFallback?: "serif" | "sans";
  /**
   * OpenType features for the UI face. `cv11`/`ss01` are Inter-specific; a
   * different family may map ss01 to something else entirely, so each theme
   * opts in explicitly.
   */
  features?: string;
  /**
   * Cards and panels take their elevation from borders: the e1/e2 shadows are
   * switched off. Overlays (e3/e4: modal, drawer, menu, toast) keep theirs.
   */
  flat?: boolean;
  /** Exact CTA gradients per mode. Derived from cta and cta-strong if omitted. */
  ctaGradient?: { light: CtaGradient; dark: CtaGradient };
  light: Tokens;
  dark: Tokens;
};

/** localStorage keys shared by the pre-paint script and the theme provider. */
export const STORAGE_KEYS = { theme: "acca-theme", mode: "acca-mode" } as const;

/* ---------------------------------------------------------------- radii */

export const RADIUS: Record<string, RadiusScale> = {
  prephasz: {
    xs: "8px",
    sm: "10px",
    md: "12px",
    lg: "20px",
    xl: "24px",
    "2xl": "28px",
  },
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
    id: "prephasz",
    name: "Prephasz",
    tagline: "Black identity, yellow action",
    blurb:
      "High-contrast and flat: near-black identity, a yellow-to-gold call to action with dark ink, cards drawn with borders instead of shadows, set in Bricolage Grotesque over Plus Jakarta Sans.",
    fonts: {
      display: "--ff-bricolage",
      sans: "--ff-jakarta",
      mono: "--ff-jetbrains",
    },
    faces: {
      display: "Bricolage Grotesque",
      sans: "Plus Jakarta Sans",
      mono: "JetBrains Mono",
    },
    radius: RADIUS.prephasz,
    displayTracking: "-0.03em",
    displayWeight: "700",
    displayFallback: "sans",
    flat: true,
    ctaGradient: {
      light: {
        rest: "linear-gradient(135deg,#ffd24d 0%,#ffc42d 48%,#f5b400 100%)",
        hover: "linear-gradient(135deg,#ffc42d 0%,#f5b400 55%,#e6a600 100%)",
      },
      dark: {
        rest: "linear-gradient(135deg,#ffd24d 0%,#ffc42d 48%,#f5b400 100%)",
        hover: "linear-gradient(135deg,#ffc42d 0%,#f5b400 55%,#e6a600 100%)",
      },
    },
    light: {
      paper: "#f6f7fb",
      surface: "#ffffff",
      "surface-2": "#f1f4f9",
      "surface-3": "#e5eaf2",
      "surface-inv": "#16171d",
      line: "#e3e8f1",
      "line-strong": "#cbd3df",
      ink: "#101322",
      "ink-2": "#3d4757",
      "ink-3": "#5a6477",
      "ink-inv": "#ffffff",
      brand: "#16171d",
      "brand-hover": "#2c2e37",
      "brand-soft": "#fff5ea",
      "brand-line": "#f1d58e",
      "on-brand": "#ffffff",
      jade: "#0b7a55",
      "jade-soft": "#e3f6ee",
      ember: "#b8420b",
      "ember-soft": "#ffedd5",
      amber: "#8a5300",
      "amber-soft": "#fdf1d6",
      rose: "#b91c1c",
      "rose-soft": "#fee2e2",
      violet: "#6d3fd6",
      "violet-soft": "#efe9fc",
      "on-accent": "#ffffff",
      info: "#1d4ed8",
      "info-soft": "#e6eefe",
      cta: "#ffc42d",
      "cta-strong": "#f5b400",
      "cta-soft": "#fff5ea",
      "cta-ink": "#171717",
      "nav-active": "#16171d",
      "nav-active-ink": "#ffffff",
      "nav-active-icon": "#ffc42d",
    },
    dark: {
      paper: "#0b0c10",
      surface: "#14161c",
      "surface-2": "#1b1e26",
      "surface-3": "#242833",
      "surface-inv": "#22252f",
      line: "#262a34",
      "line-strong": "#3b404d",
      ink: "#f3f4f7",
      "ink-2": "#b9c0cc",
      "ink-3": "#939bab",
      "ink-inv": "#ffffff",
      brand: "#ffc42d",
      "brand-hover": "#ffd24d",
      "brand-soft": "#2a2410",
      "brand-line": "#5a4816",
      "on-brand": "#171717",
      jade: "#3ecf97",
      "jade-soft": "#0f2a20",
      ember: "#ff8a4c",
      "ember-soft": "#2e1a0e",
      amber: "#f2b84b",
      "amber-soft": "#2b2008",
      rose: "#ff6b7d",
      "rose-soft": "#2f1318",
      violet: "#b194ff",
      "violet-soft": "#211a3a",
      "on-accent": "#0b0c10",
      info: "#7aa7ff",
      "info-soft": "#121d36",
      cta: "#ffc42d",
      "cta-strong": "#f5b400",
      "cta-soft": "#2a2410",
      "cta-ink": "#171717",
      "nav-active": "#ffc42d",
      "nav-active-ink": "#171717",
      "nav-active-icon": "#171717",
    },
  },
  {
    id: "meridian",
    name: "Cobalt",
    tagline: "Warm paper, electric cobalt",
    blurb:
      "A warm off-white ground with near-black ink and one confident cobalt blue, set in a high-contrast serif over Inter.",
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
    features: '"cv11", "ss01"',
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
      info: "#2d5bff",
      "info-soft": "#ecf0ff",
      cta: "#2d5bff",
      "cta-strong": "#1e42d0",
      "cta-soft": "#ecf0ff",
      "cta-ink": "#ffffff",
      "nav-active": "#14161b",
      "nav-active-ink": "#f7f6f3",
      "nav-active-icon": "#7093ff",
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
      info: "#7093ff",
      "info-soft": "#161d33",
      cta: "#7093ff",
      "cta-strong": "#8aa6ff",
      "cta-soft": "#161d33",
      "cta-ink": "#0a0f22",
      "nav-active": "#f3f2ef",
      "nav-active-ink": "#14161b",
      "nav-active-icon": "#2d5bff",
    },
  },
  {
    id: "broadsheet",
    name: "Broadsheet",
    tagline: "Toned paper, spot ink, square corners",
    blurb:
      "Toned book stock and warm blue-black ink, accents retuned as printer's spot inks, and square corners, so dense tables read like a printed page.",
    fonts: {
      display: "--ff-newsreader",
      sans: "--ff-libre-franklin",
      mono: "--ff-jetbrains",
    },
    faces: {
      display: "Newsreader",
      sans: "Libre Franklin",
      mono: "JetBrains Mono",
    },
    radius: RADIUS.sharp,
    displayTracking: "-0.015em",
    displayWeight: "400",
    pill: "2px",
    light: {
      paper: "#f6f1e6",
      surface: "#fdfbf5",
      "surface-2": "#ece5d6",
      "surface-3": "#ddd4c0",
      "surface-inv": "#1a1814",
      line: "#ddd6c6",
      "line-strong": "#c6bda8",
      ink: "#1b1712",
      "ink-2": "#4a453b",
      "ink-3": "#6a6252",
      "ink-inv": "#f7f3ea",
      brand: "#234b7d",
      "brand-hover": "#1a3a63",
      "brand-soft": "#e4eaf2",
      "brand-line": "#b9c8dc",
      "on-brand": "#fdfbf5",
      jade: "#2c6248",
      "jade-soft": "#e2ece2",
      ember: "#a63c15",
      "ember-soft": "#f8e9dd",
      amber: "#79620f",
      "amber-soft": "#f5ecd4",
      rose: "#a52240",
      "rose-soft": "#f8e4e6",
      violet: "#6a3d8c",
      "violet-soft": "#efe6f2",
      "on-accent": "#fffdf8",
      info: "#234b7d",
      "info-soft": "#e4eaf2",
      cta: "#234b7d",
      "cta-strong": "#1a3a63",
      "cta-soft": "#e4eaf2",
      "cta-ink": "#fdfbf5",
      "nav-active": "#1a1814",
      "nav-active-ink": "#f7f3ea",
      "nav-active-icon": "#7ea6d8",
    },
    dark: {
      paper: "#12100d",
      surface: "#191713",
      "surface-2": "#211e19",
      "surface-3": "#2b2721",
      "surface-inv": "#f4efe4",
      line: "#2b2721",
      "line-strong": "#3e3931",
      ink: "#f3eee3",
      "ink-2": "#b4ac9c",
      "ink-3": "#968f7e",
      "ink-inv": "#1b1712",
      brand: "#7ea6d8",
      "brand-hover": "#9bbde6",
      "brand-soft": "#16202c",
      "brand-line": "#2a3a4d",
      "on-brand": "#0d1620",
      jade: "#6fbf95",
      "jade-soft": "#10201a",
      ember: "#e0754a",
      "ember-soft": "#251610",
      amber: "#cca83a",
      "amber-soft": "#231a0c",
      rose: "#ea7185",
      "rose-soft": "#26131a",
      violet: "#b48ad6",
      "violet-soft": "#1d1526",
      "on-accent": "#12100d",
      info: "#7ea6d8",
      "info-soft": "#16202c",
      cta: "#7ea6d8",
      "cta-strong": "#9bbde6",
      "cta-soft": "#16202c",
      "cta-ink": "#0d1620",
      "nav-active": "#f4efe4",
      "nav-active-ink": "#1b1712",
      "nav-active-icon": "#234b7d",
    },
  },
  {
    id: "bindery",
    name: "Bindery",
    tagline: "Cream paper, pigment ink, soft corners",
    blurb:
      "Unbleached-paper neutrals with a brown-black ink and one calm ultramarine, set in Fraunces over Work Sans for long reading.",
    fonts: {
      display: "--ff-fraunces",
      sans: "--ff-work-sans",
      mono: "--ff-jetbrains",
    },
    faces: {
      display: "Fraunces",
      sans: "Work Sans",
      mono: "JetBrains Mono",
    },
    radius: RADIUS.large,
    displayTracking: "-0.01em",
    displayWeight: "600",
    light: {
      paper: "#f8f2e8",
      surface: "#fffcf6",
      "surface-2": "#f3ecdf",
      "surface-3": "#eae1d0",
      "surface-inv": "#221c15",
      line: "#e5dbc9",
      "line-strong": "#b8a283",
      ink: "#231b12",
      "ink-2": "#574a3c",
      "ink-3": "#6d5f4c",
      "ink-inv": "#f9f4ea",
      brand: "#3f4fa3",
      "brand-hover": "#2f3c8e",
      "brand-soft": "#e6eafb",
      "brand-line": "#c6cdf4",
      "on-brand": "#fffcf6",
      jade: "#306c40",
      "jade-soft": "#e1f0d7",
      ember: "#9b4819",
      "ember-soft": "#fee3d4",
      amber: "#7f5c1d",
      "amber-soft": "#fae7c7",
      rose: "#aa2e4e",
      "rose-soft": "#fde2e1",
      violet: "#724598",
      "violet-soft": "#f2e5fa",
      "on-accent": "#fffcf6",
      info: "#3f4fa3",
      "info-soft": "#e6eafb",
      cta: "#3f4fa3",
      "cta-strong": "#2f3c8e",
      "cta-soft": "#e6eafb",
      "cta-ink": "#fffcf6",
      "nav-active": "#221c15",
      "nav-active-ink": "#f9f4ea",
      "nav-active-icon": "#9da6eb",
    },
    dark: {
      paper: "#16120e",
      surface: "#1e1913",
      "surface-2": "#272019",
      "surface-3": "#322a21",
      "surface-inv": "#f7f1e6",
      line: "#372e25",
      "line-strong": "#5f5243",
      ink: "#f4ece0",
      "ink-2": "#c2b4a2",
      "ink-3": "#a29383",
      "ink-inv": "#221c15",
      brand: "#9da6eb",
      "brand-hover": "#b4bcf8",
      "brand-soft": "#181a2e",
      "brand-line": "#2d3055",
      "on-brand": "#16120e",
      jade: "#86be8a",
      "jade-soft": "#112110",
      ember: "#f08c4c",
      "ember-soft": "#2a160a",
      amber: "#dca744",
      "amber-soft": "#271903",
      rose: "#ef7e92",
      "rose-soft": "#2c1416",
      violet: "#bf93e6",
      "violet-soft": "#22172a",
      "on-accent": "#16120e",
      info: "#9da6eb",
      "info-soft": "#181a2e",
      cta: "#9da6eb",
      "cta-strong": "#b4bcf8",
      "cta-soft": "#181a2e",
      "cta-ink": "#16120e",
      "nav-active": "#f7f1e6",
      "nav-active-ink": "#221c15",
      "nav-active-icon": "#3f4fa3",
    },
  },
  {
    id: "norrland",
    name: "Norrland",
    tagline: "Cool northern light, almost no chrome",
    blurb:
      "One cool blue-grey axis for every surface and hairline, half-chroma accents and a deep petrol blue, set in institutional grotesques.",
    fonts: {
      display: "--ff-familjen",
      sans: "--ff-public-sans",
      mono: "--ff-jetbrains",
    },
    faces: {
      display: "Familjen Grotesk",
      sans: "Public Sans",
      mono: "JetBrains Mono",
    },
    radius: RADIUS.small,
    displayTracking: "-0.02em",
    displayWeight: "500",
    light: {
      paper: "#f6f8fa",
      surface: "#ffffff",
      "surface-2": "#eef2f4",
      "surface-3": "#e2e8ec",
      "surface-inv": "#192227",
      line: "#dde3e6",
      "line-strong": "#c5ced3",
      ink: "#162025",
      "ink-2": "#48555c",
      "ink-3": "#606b73",
      "ink-inv": "#f3f6f8",
      brand: "#2a5c7d",
      "brand-hover": "#164867",
      "brand-soft": "#e9f4fc",
      "brand-line": "#bfd8eb",
      "on-brand": "#ffffff",
      jade: "#3e765a",
      "jade-soft": "#e9f7ee",
      ember: "#974a24",
      "ember-soft": "#ffede4",
      amber: "#796d1a",
      "amber-soft": "#f7f4e2",
      rose: "#881f38",
      "rose-soft": "#ffebec",
      violet: "#644a80",
      "violet-soft": "#f4eefc",
      "on-accent": "#ffffff",
      info: "#2a5c7d",
      "info-soft": "#e9f4fc",
      cta: "#2a5c7d",
      "cta-strong": "#164867",
      "cta-soft": "#e9f4fc",
      "cta-ink": "#ffffff",
      "nav-active": "#192227",
      "nav-active-ink": "#f3f6f8",
      "nav-active-icon": "#8bb7d7",
    },
    dark: {
      paper: "#0c1114",
      surface: "#151b1f",
      "surface-2": "#1d2428",
      "surface-3": "#283035",
      "surface-inv": "#eff2f4",
      line: "#272f34",
      "line-strong": "#3e484e",
      ink: "#eaedf0",
      "ink-2": "#b0b9be",
      "ink-3": "#838c92",
      "ink-inv": "#171f25",
      brand: "#8bb7d7",
      "brand-hover": "#a7cde9",
      "brand-soft": "#1c2e3a",
      "brand-line": "#2e4556",
      "on-brand": "#0e1519",
      jade: "#9bd7b6",
      "jade-soft": "#1f3127",
      ember: "#f0a27f",
      "ember-soft": "#3b261c",
      amber: "#d9cc80",
      "amber-soft": "#302d19",
      rose: "#e1828e",
      "rose-soft": "#3d2326",
      violet: "#c4a9e5",
      "violet-soft": "#32293d",
      "on-accent": "#0e1417",
      info: "#8bb7d7",
      "info-soft": "#1c2e3a",
      cta: "#8bb7d7",
      "cta-strong": "#a7cde9",
      "cta-soft": "#1c2e3a",
      "cta-ink": "#0e1519",
      "nav-active": "#eff2f4",
      "nav-active-ink": "#171f25",
      "nav-active-icon": "#2a5c7d",
    },
  },
  {
    id: "flight-deck",
    name: "Flight Deck",
    tagline: "Anodized panel, cyan trace",
    blurb:
      "Anodized-panel neutrals mixed at the brand's cyan hue, colour spent only on state, set in Space Grotesk over Public Sans.",
    fonts: {
      display: "--ff-space-grotesk",
      sans: "--ff-public-sans",
      mono: "--ff-azeret",
    },
    faces: {
      display: "Space Grotesk",
      sans: "Public Sans",
      mono: "Azeret Mono",
    },
    radius: RADIUS.sharp,
    displayTracking: "-0.025em",
    displayWeight: "600",
    pill: "2px",
    light: {
      paper: "#e8eef1",
      surface: "#f9fcfd",
      "surface-2": "#e4ebef",
      "surface-3": "#d0dadf",
      "surface-inv": "#11181d",
      line: "#ccd5da",
      "line-strong": "#adbac1",
      ink: "#0d171c",
      "ink-2": "#424f56",
      "ink-3": "#5d6a72",
      "ink-inv": "#f1f5f7",
      brand: "#007594",
      "brand-hover": "#00576e",
      "brand-soft": "#e2f7ff",
      "brand-line": "#a4d7eb",
      "on-brand": "#ffffff",
      jade: "#277a46",
      "jade-soft": "#e3f9e8",
      ember: "#b34b0c",
      "ember-soft": "#ffefe8",
      amber: "#8b6400",
      "amber-soft": "#fdf1db",
      rose: "#bd395e",
      "rose-soft": "#ffedf0",
      violet: "#7a56c1",
      "violet-soft": "#f3f0ff",
      "on-accent": "#ffffff",
      info: "#007594",
      "info-soft": "#e2f7ff",
      cta: "#007594",
      "cta-strong": "#00576e",
      "cta-soft": "#e2f7ff",
      "cta-ink": "#ffffff",
      "nav-active": "#11181d",
      "nav-active-ink": "#f1f5f7",
      "nav-active-icon": "#34c9f7",
    },
    dark: {
      paper: "#090e10",
      surface: "#12181b",
      "surface-2": "#1b2226",
      "surface-3": "#272f34",
      "surface-inv": "#edf2f4",
      line: "#222a2e",
      "line-strong": "#39444a",
      ink: "#e9eff2",
      "ink-2": "#a6b0b7",
      "ink-3": "#828e94",
      "ink-inv": "#0d171c",
      brand: "#34c9f7",
      "brand-hover": "#84deff",
      "brand-soft": "#082934",
      "brand-line": "#0d4f64",
      "on-brand": "#021218",
      jade: "#7acb91",
      "jade-soft": "#142a1a",
      ember: "#fc8e59",
      "ember-soft": "#351e13",
      amber: "#e4b455",
      "amber-soft": "#2f220a",
      rose: "#ff7695",
      "rose-soft": "#361b21",
      violet: "#bba0ff",
      "violet-soft": "#262037",
      "on-accent": "#090f13",
      info: "#34c9f7",
      "info-soft": "#082934",
      cta: "#34c9f7",
      "cta-strong": "#84deff",
      "cta-soft": "#082934",
      "cta-ink": "#021218",
      "nav-active": "#edf2f4",
      "nav-active-ink": "#0d171c",
      "nav-active-icon": "#007594",
    },
  },
  {
    id: "nitrate",
    name: "Nitrate",
    tagline: "Warm stock, teal-black grade",
    blurb:
      "Warm stock in light and a teal-black cinema grade in dark, with luminous warm accents against a cool cyan brand.",
    fonts: {
      display: "--ff-archivo",
      sans: "--ff-public-sans",
      mono: "--ff-azeret",
    },
    faces: {
      display: "Archivo",
      sans: "Public Sans",
      mono: "Azeret Mono",
    },
    radius: RADIUS.small,
    displayTracking: "-0.022em",
    displayWeight: "600",
    light: {
      paper: "#f6f3ef",
      surface: "#ffffff",
      "surface-2": "#efeae4",
      "surface-3": "#e2dbd2",
      "surface-inv": "#14100c",
      line: "#e3ddd4",
      "line-strong": "#c9c0b4",
      ink: "#17130f",
      "ink-2": "#4a443c",
      "ink-3": "#6a6259",
      "ink-inv": "#f4f0ea",
      brand: "#06718A",
      "brand-hover": "#04566B",
      "brand-soft": "#dff1f6",
      "brand-line": "#a3d5e2",
      "on-brand": "#FFFFFF",
      jade: "#146B48",
      "jade-soft": "#dcefe4",
      ember: "#BB3F17",
      "ember-soft": "#fbe8de",
      amber: "#845C06",
      "amber-soft": "#f7eed4",
      rose: "#BC2452",
      "rose-soft": "#fbe5ea",
      violet: "#653DD2",
      "violet-soft": "#ebe7fb",
      "on-accent": "#FFFFFF",
      info: "#06718A",
      "info-soft": "#dff1f6",
      cta: "#06718A",
      "cta-strong": "#04566B",
      "cta-soft": "#dff1f6",
      "cta-ink": "#FFFFFF",
      "nav-active": "#14100c",
      "nav-active-ink": "#f4f0ea",
      "nav-active-icon": "#3FCFEA",
    },
    dark: {
      paper: "#05090C",
      surface: "#0D151A",
      "surface-2": "#141E24",
      "surface-3": "#1D2A31",
      "surface-inv": "#EDF2F3",
      line: "#202E36",
      "line-strong": "#31424B",
      ink: "#E7EFF2",
      "ink-2": "#A5B6BE",
      "ink-3": "#83959D",
      "ink-inv": "#0A1013",
      brand: "#3FCFEA",
      "brand-hover": "#6FDDF1",
      "brand-soft": "#062631",
      "brand-line": "#134B5C",
      "on-brand": "#03181F",
      jade: "#49D69B",
      "jade-soft": "#07261A",
      ember: "#FF7A4D",
      "ember-soft": "#2D120A",
      amber: "#E8B234",
      "amber-soft": "#281C07",
      rose: "#FF6B90",
      "rose-soft": "#2E101C",
      violet: "#A98BFF",
      "violet-soft": "#1C1638",
      "on-accent": "#05100E",
      info: "#3FCFEA",
      "info-soft": "#062631",
      cta: "#3FCFEA",
      "cta-strong": "#6FDDF1",
      "cta-soft": "#062631",
      "cta-ink": "#03181F",
      "nav-active": "#EDF2F3",
      "nav-active-ink": "#0A1013",
      "nav-active-icon": "#06718A",
    },
  },
  {
    id: "signal",
    name: "Signal",
    tagline: "Black rules, one violent ultramarine",
    blurb:
      "Swiss signage: achromatic planes, ruled hairlines and one violent ultramarine, with poster-weight Archivo headings.",
    fonts: {
      display: "--ff-archivo",
      sans: "--ff-public-sans",
      mono: "--ff-jetbrains",
    },
    faces: {
      display: "Archivo",
      sans: "Public Sans",
      mono: "JetBrains Mono",
    },
    radius: RADIUS.sharp,
    displayTracking: "-0.035em",
    displayWeight: "900",
    pill: "0px",
    light: {
      paper: "#ececec",
      surface: "#ffffff",
      "surface-2": "#e2e2e2",
      "surface-3": "#d2d2d2",
      "surface-inv": "#0a0a0a",
      line: "#a9a9a9",
      "line-strong": "#1c1c1c",
      ink: "#0a0a0a",
      "ink-2": "#4a4a4a",
      "ink-3": "#5e5e5e",
      "ink-inv": "#ffffff",
      brand: "#1f16e8",
      "brand-hover": "#1610b4",
      "brand-soft": "#c6c4f9",
      "brand-line": "#6b62ec",
      "on-brand": "#ffffff",
      jade: "#006446",
      "jade-soft": "#b6e2d5",
      ember: "#9c3400",
      "ember-soft": "#f6d2c0",
      amber: "#735000",
      "amber-soft": "#edd8a6",
      rose: "#b1022d",
      "rose-soft": "#f8ced9",
      violet: "#8d12b7",
      "violet-soft": "#ead1f3",
      "on-accent": "#ffffff",
      info: "#1f16e8",
      "info-soft": "#c6c4f9",
      cta: "#1f16e8",
      "cta-strong": "#1610b4",
      "cta-soft": "#c6c4f9",
      "cta-ink": "#ffffff",
      "nav-active": "#0a0a0a",
      "nav-active-ink": "#ffffff",
      "nav-active-icon": "#7b78ff",
    },
    dark: {
      paper: "#0a0a0a",
      surface: "#151515",
      "surface-2": "#1e1e1e",
      "surface-3": "#2a2a2a",
      "surface-inv": "#f2f2f2",
      line: "#4e4e4e",
      "line-strong": "#9a9a9a",
      ink: "#f5f5f5",
      "ink-2": "#b0b0b0",
      "ink-3": "#8f8f8f",
      "ink-inv": "#0a0a0a",
      brand: "#7b78ff",
      "brand-hover": "#9490ff",
      "brand-soft": "#14123f",
      "brand-line": "#3b37a8",
      "on-brand": "#0a0a0a",
      jade: "#35c88f",
      "jade-soft": "#06251a",
      ember: "#ff7a3d",
      "ember-soft": "#2a1207",
      amber: "#e8b22e",
      "amber-soft": "#241a05",
      rose: "#ff5c7a",
      "rose-soft": "#2b0f17",
      violet: "#b478ff",
      "violet-soft": "#1f1136",
      "on-accent": "#0a0a0a",
      info: "#7b78ff",
      "info-soft": "#14123f",
      cta: "#7b78ff",
      "cta-strong": "#9490ff",
      "cta-soft": "#14123f",
      "cta-ink": "#0a0a0a",
      "nav-active": "#f2f2f2",
      "nav-active-ink": "#0a0a0a",
      "nav-active-icon": "#1f16e8",
    },
  },
];

export const DEFAULT_THEME = "prephasz";

export const themeById = (id: string) =>
  themes.find((t) => t.id === id) ?? themes[0];

/* ------------------------------------------------------------ generation */

function block(selector: string, decls: string[]) {
  return `${selector}{${decls.join("")}}`;
}

function tokenDecls(tokens: Tokens) {
  return TOKENS.map((t) => `--${t}:${tokens[t]};`);
}

/** The CTA gradient for one mode: the theme's own, or derived from its tokens. */
export function ctaGradient(theme: Theme, mode: "light" | "dark"): CtaGradient {
  const own = theme.ctaGradient?.[mode];
  if (own) return own;
  const t = theme[mode];
  return {
    rest: `linear-gradient(135deg,${t.cta} 0%,${t.cta} 48%,${t["cta-strong"]} 100%)`,
    hover: `linear-gradient(135deg,${t["cta-strong"]} 0%,${t["cta-strong"]} 100%)`,
  };
}

function ctaDecls(theme: Theme, mode: "light" | "dark") {
  const g = ctaGradient(theme, mode);
  return [`--cta-grad:${g.rest};`, `--cta-grad-hover:${g.hover};`];
}

/**
 * Surfaces that are dark by nature (video chrome, code blocks, the marketing
 * showcase panels) must not flip to white in dark mode, but should still
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

/** "r g b" for the shadow colour, tinted by the theme's own ink. */
function shadowTint(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const DISPLAY_FALLBACK = {
  serif: "ui-serif,Georgia,serif",
  sans: "ui-sans-serif,system-ui,sans-serif",
};

function shellDecls(theme: Theme) {
  const r = theme.radius;
  const decls = [
    `--stack-display:var(${theme.fonts.display}),${DISPLAY_FALLBACK[theme.displayFallback ?? "serif"]};`,
    `--stack-sans:var(${theme.fonts.sans}),ui-sans-serif,system-ui,sans-serif;`,
    `--stack-mono:var(${theme.fonts.mono}),ui-monospace,SFMono-Regular,monospace;`,
    `--display-tracking:${theme.displayTracking ?? "-0.02em"};`,
    `--display-weight:${theme.displayWeight ?? "400"};`,
    `--r-xs:${r.xs};`,
    `--r-sm:${r.sm};`,
    `--r-md:${r.md};`,
    `--r-lg:${r.lg};`,
    `--r-xl:${r.xl};`,
    `--r-2xl:${r["2xl"]};`,
    `--r-pill:${theme.pill ?? "9999px"};`,
    `--font-features:${theme.features ?? "normal"};`,
    // A warm theme should cast a warm shadow, not a neutral grey one.
    `--shadow-color:${shadowTint(theme.light.ink)};`,
  ];
  if (theme.flat) {
    // A transparent shadow, not `none`: the utilities compose these into a
    // comma list with ring shadows, where `none` would invalidate the lot.
    decls.push("--shadow-e1:0 0 #0000;", "--shadow-e2:0 0 #0000;");
  }
  return decls;
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
          ...ctaDecls(t, "light"),
          "color-scheme:light;",
        ]),
        block(`html[data-theme="${t.id}"].dark`, [
          ...tokenDecls(t.dark),
          ...ctaDecls(t, "dark"),
          "--shadow-color:0 0 0;",
          "color-scheme:dark;",
        ]),
      ].join(""),
    )
    .join("");
}

/** id -> [light ground, dark ground], for the <meta name="theme-color"> the
 *  bootstrap script writes. Static metadata cannot vary per stored theme. */
export function themeColorMap() {
  return Object.fromEntries(
    themes.map((t) => [t.id, [t.light.paper, t.dark.paper]]),
  );
}

/** Swatch shown on the picker chip: ground, ink, call to action, and two accents. */
export function swatch(theme: Theme, mode: "light" | "dark" = "light") {
  const t = mode === "dark" ? theme.dark : theme.light;
  return [t.paper, t.ink, t.cta, t.jade, t.ember];
}
