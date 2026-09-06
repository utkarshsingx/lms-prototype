import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { DEFAULT_THEME, themeCss } from "@/lib/themes";
import "./globals.css";

/* Every theme's faces are imported here, because next/font is a build-time
   transform: a user picking a theme at runtime cannot trigger a new import.
   Each family exposes a namespaced --ff-* variable; a theme block re-points
   --stack-sans/display/mono at the ones it wants. The classes are all applied
   to <html>, but the browser only downloads the faces that rendered text
   actually uses, so the unpicked themes cost nothing at paint. */

const inter = Inter({
  variable: "--ff-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--ff-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--ff-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const fontVars = [inter, instrumentSerif, jetbrains]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: {
    default: "Meridian — the learning platform",
    template: "%s · Meridian",
  },
  description:
    "Author courses, run assessments, sequence learning paths, and reach every learner over chat, WhatsApp and voice.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0e" },
  ],
};

// Runs before paint so neither the palette nor the mode ever flashes wrong.
const bootstrap = `
(function(){try{
  var e=document.documentElement;
  var legacy=localStorage.getItem("meridian-theme");
  if(legacy==="light"||legacy==="dark"){localStorage.setItem("meridian-mode",legacy);localStorage.removeItem("meridian-theme");}
  var t=localStorage.getItem("meridian-theme")||"${DEFAULT_THEME}";
  var m=localStorage.getItem("meridian-mode");
  e.setAttribute("data-theme",t);
  if(m==="dark"||(!m&&window.matchMedia("(prefers-color-scheme: dark)").matches))e.classList.add("dark");
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
