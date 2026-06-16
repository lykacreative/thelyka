"use client";

import { useEffect } from "react";

const storageKey = "lyka-theme";

export function ThemeInit() {
  useEffect(() => {
    try {
      const theme = window.localStorage.getItem(storageKey);
      if (theme === "dark" || theme === "light") {
        document.documentElement.dataset.theme = theme;
      }
    } catch {
      // Ignore storage access errors, such as private browsing restrictions.
    }
  }, []);

  return null;
}
