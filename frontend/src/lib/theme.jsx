// By: Md. Fahim Bin Amin
//
// React theme context: exposes the active color scheme ("light" or "dark") and a
// toggleTheme() function. The choice is cached in localStorage per device (unlike
// the language preference, it is not tied to the signed-in account) and falls back
// to the OS-level `prefers-color-scheme` on first visit. Applies the "dark" class
// to <html> so Tailwind's class-based dark: variants take effect.

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "formy_theme";
const ThemeContext = createContext(null);

/**
 * @returns {"light" | "dark"} the theme cached on this device, or the OS
 *   `prefers-color-scheme` if none is cached yet
 */
function readInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  /**
   * @returns {void}
   */
  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * @returns {{ theme: "light" | "dark", toggleTheme: () => void }}
 */
export function useTheme() {
  return useContext(ThemeContext);
}
