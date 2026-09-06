"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DEFAULT_THEME, themeById, themes, type Theme } from "@/lib/themes";

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("light");
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME);

  // The bootstrap script in <head> already applied both; read them back rather
  // than re-deciding, so the provider and the DOM can never disagree.
  useEffect(() => {
    const el = document.documentElement;
    setModeState(el.classList.contains("dark") ? "dark" : "light");
    setThemeIdState(el.getAttribute("data-theme") ?? DEFAULT_THEME);
  }, []);

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("meridian-mode", next);
    } catch {
      /* private mode — the choice just does not persist */
    }
  }, []);

  const setThemeId = useCallback((id: string) => {
    const next = themeById(id).id;
    setThemeIdState(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("meridian-theme", next);
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
