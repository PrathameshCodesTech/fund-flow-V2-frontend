import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type ThemeMode = "light" | "dark";
export type ColorTheme = "blue" | "green";

interface ThemeContextType {
  mode: ThemeMode;
  colorTheme: ColorTheme;
  toggleMode: () => void;
  setColorTheme: (color: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyTheme(mode: ThemeMode, colorTheme: ColorTheme) {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  root.setAttribute("data-color", colorTheme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("mf-theme") as ThemeMode | null;
    const resolved =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    const storedColor = localStorage.getItem("mf-color-theme") as ColorTheme | null;
    const resolvedColor =
      storedColor === "blue" || storedColor === "green" ? storedColor : "blue";

    // Apply synchronously during init to avoid flash
    applyTheme(resolved, resolvedColor);

    return resolved;
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const stored = localStorage.getItem("mf-color-theme") as ColorTheme | null;
    return stored === "blue" || stored === "green" ? stored : "blue";
  });

  useEffect(() => {
    applyTheme(mode, colorTheme);
    localStorage.setItem("mf-theme", mode);
    localStorage.setItem("mf-color-theme", colorTheme);
  }, [mode, colorTheme]);

  const toggleMode = () => setMode((prev) => (prev === "light" ? "dark" : "light"));

  const setColorTheme = (color: ColorTheme) => {
    setColorThemeState(color);
  };

  return (
    <ThemeContext.Provider value={{ mode, colorTheme, toggleMode, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const mode: ThemeMode = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    const colorTheme: ColorTheme =
      document.documentElement.getAttribute("data-color") === "green"
        ? "green"
        : "blue";

    return {
      mode,
      colorTheme,
      toggleMode: () => {
        const nextMode: ThemeMode = document.documentElement.classList.contains("dark")
          ? "light"
          : "dark";
        applyTheme(nextMode, colorTheme);
        localStorage.setItem("mf-theme", nextMode);
      },
      setColorTheme: (color: ColorTheme) => {
        applyTheme(mode, color);
        localStorage.setItem("mf-color-theme", color);
      },
    };
  }
  return ctx;
}
