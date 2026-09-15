"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_THEME,
  STORAGE_KEYS,
  themeById,
  themes,
  type Theme,
} from "@/lib/themes";

type Mode = "light" | "dark";

type Ctx = {
  /** Light or dark, within the chosen palette. */
  mode: Mode;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  /** The chosen palette. */
  themeId: string;
  theme: Theme;
  setThemeId: (id: string) => void;
  themes: Theme[];
};

const ThemeContext = createContext<Ctx>({
  mode: "light",
  setMode: () => {},
  toggleMode: () => {},
  themeId: DEFAULT_THEME,
  theme: themeById(DEFAULT_THEME),
  setThemeId: () => {},
  themes,
});

/* The <html> element is the source of truth: the bootstrap script in <head>
   applies the stored theme and mode before paint, and every change is written
   back to it. The provider only observes, so it and the DOM can never disagree
   (and nothing is decided twice). */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"],
  });
  return () => observer.disconnect();
}

const readMode = (): Mode =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";
const readThemeId = () =>
  document.documentElement.getAttribute("data-theme") ?? DEFAULT_THEME;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore<Mode>(subscribe, readMode, () => "light");
  const themeId = useSyncExternalStore(
    subscribe,
    readThemeId,
    () => DEFAULT_THEME,
  );

  const setMode = useCallback((next: Mode) => {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEYS.mode, next);
    } catch {
      /* private mode: the choice just does not persist */
    }
  }, []);

  const setThemeId = useCallback((id: string) => {
    const next = themeById(id).id;
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEYS.theme, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleMode = useCallback(
    () => setMode(mode === "dark" ? "light" : "dark"),
    [mode, setMode],
  );

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        themeId,
        theme: themeById(themeId),
        setThemeId,
        themes,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
