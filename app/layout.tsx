import type { Metadata, Viewport } from "next";
import {
  Archivo,
  Azeret_Mono,
  Bricolage_Grotesque,
  Familjen_Grotesk,
  Fraunces,
  Inter,
  Instrument_Serif,
  JetBrains_Mono,
  Libre_Franklin,
  Newsreader,
  Plus_Jakarta_Sans,
  Public_Sans,
  Space_Grotesk,
  Work_Sans,
} from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import {
  DEFAULT_THEME,
  STORAGE_KEYS,
  themeById,
  themeColorMap,
  themeCss,
} from "@/lib/themes";
import "./globals.css";

/* Every theme's faces are imported here, because next/font is a build-time
   transform: a user picking a theme at runtime cannot trigger a new import.
   Each family exposes a namespaced --ff-* variable; a theme block re-points
   --stack-sans/display/mono at the ones it wants.
   `preload` defaults to TRUE and fetches the file on first paint whether or
   not any text uses it, so only the default theme's three faces (Prephasz:
   Plus Jakarta Sans, Bricolage Grotesque, JetBrains Mono) preload. Everything
   else is fetched when a theme that uses it is actually selected.
   next/font is a build-time transform, so every option object here has to be a
   literal: no spreads, no shared constants. */

const jakarta = Plus_Jakarta_Sans({
  variable: "--ff-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--ff-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--ff-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

/* The other themes' faces. All variable where the family allows, so each is
   one file and roughly a kilobyte of @font-face CSS. */

const inter = Inter({
  variable: "--ff-inter",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Ships weight 400 only; request italic explicitly so <em> gets a real face
// rather than a synthetic oblique.
const instrumentSerif = Instrument_Serif({
  variable: "--ff-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const newsreader = Newsreader({
  variable: "--ff-newsreader",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const libreFranklin = Libre_Franklin({
  variable: "--ff-libre-franklin",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const fraunces = Fraunces({
  variable: "--ff-fraunces",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const workSans = Work_Sans({
  variable: "--ff-work-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const familjen = Familjen_Grotesk({
  variable: "--ff-familjen",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const publicSans = Public_Sans({
  variable: "--ff-public-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  variable: "--ff-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const archivo = Archivo({
  variable: "--ff-archivo",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const azeret = Azeret_Mono({
  variable: "--ff-azeret",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const fontVars = [
  jakarta,
  bricolage,
  jetbrains,
  inter,
  instrumentSerif,
  newsreader,
  libreFranklin,
  fraunces,
  workSans,
  familjen,
  publicSans,
  spaceGrotesk,
  archivo,
  azeret,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: {
    default: "ACCA LMS",
    template: "%s · ACCA LMS",
  },
  description:
    "ZSkillup's ACCA learning platform: papers, live classes, mocks, exams and exemptions, university partnerships, mentoring and careers, in one workspace for every role.",
};

const defaultTheme = themeById(DEFAULT_THEME);

export const viewport: Viewport = {
  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: defaultTheme.light.paper,
    },
    { media: "(prefers-color-scheme: dark)", color: defaultTheme.dark.paper },
  ],
};

// Static viewport metadata cannot vary with a stored theme, so the bootstrap
// writes the browser-chrome colour for whichever theme is actually resolved.
const THEME_COLORS = JSON.stringify(themeColorMap());

// Runs before paint so neither the palette nor the mode ever flashes wrong.
// A first visit is always the default theme in light: the OS preference is
// deliberately not consulted until the visitor picks a mode themselves.
const bootstrap = `
(function(){try{
  var e=document.documentElement;
  var t=localStorage.getItem(${JSON.stringify(STORAGE_KEYS.theme)})||"${DEFAULT_THEME}";
  var m=localStorage.getItem(${JSON.stringify(STORAGE_KEYS.mode)});
  var colors=${THEME_COLORS};
  if(!colors[t]){t="${DEFAULT_THEME}";}
  e.setAttribute("data-theme",t);
  var dark=m==="dark";
  e.classList.toggle("dark",dark);
  var meta=document.querySelector('meta[name="theme-color"]');
  if(!meta){meta=document.createElement("meta");meta.setAttribute("name","theme-color");document.head.appendChild(meta);}
  meta.setAttribute("content",colors[t][dark?1:0]);
}catch(err){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={fontVars}
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: bootstrap }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
