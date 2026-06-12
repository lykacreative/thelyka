"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FaMoon, FaSun } from "react-icons/fa6";

type Theme = "light" | "dark";

const storageKey = "lyka-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(storageKey) as Theme | null;
    const initialTheme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group fixed right-3 top-3 z-40 flex h-9 w-[68px] items-center overflow-hidden rounded-full border border-[var(--frame)] bg-[var(--page-bg-solid)] p-[3px] shadow-[0_10px_30px_var(--shadow)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)] sm:right-4 sm:top-4 sm:h-11 sm:w-[84px] sm:p-1"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark
            ? "linear-gradient(90deg, #6e3d23 0%, #030303 100%)"
            : "linear-gradient(90deg, #f5eedb 0%, #e6d2b6 100%)"
        }}
      />

      <span
        aria-hidden="true"
        className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center text-[var(--page-fg)]/30 transition group-hover:text-[var(--page-fg)]/60 sm:h-9 sm:w-9"
      >
        <FaSun className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>

      <span
        aria-hidden="true"
        className="relative z-10 ml-auto flex h-7 w-7 shrink-0 items-center justify-center text-[var(--page-fg)]/30 transition group-hover:text-[var(--page-fg)]/60 sm:h-9 sm:w-9"
      >
        <FaMoon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </span>

      <motion.span
        layout
        aria-hidden="true"
        className="lyka-theme-thumb absolute top-[3px] z-20 grid h-7 w-7 place-items-center rounded-full border border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)] shadow-[0_6px_18px_var(--shadow)] sm:top-1 sm:h-9 sm:w-9"
        initial={false}
        animate={{
          rotate: isDark ? 360 : 0,
          scale: mounted ? 1 : 0.6
        }}
        transition={{
          rotate: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          scale: { duration: 0.4, ease: "easeOut" }
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? "moon" : "sun"}
            initial={{ opacity: 0, scale: 0.4, rotate: isDark ? -90 : 90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.4, rotate: isDark ? 90 : -90 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="grid place-items-center"
          >
            {isDark ? (
              <FaMoon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            ) : (
              <span className="relative grid place-items-center">
                <FaSun className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute h-[140%] w-[140%]"
                  style={{
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, currentColor 6deg, transparent 14deg, transparent 50deg, currentColor 56deg, transparent 64deg, transparent 120deg, currentColor 126deg, transparent 134deg, transparent 180deg, currentColor 186deg, transparent 194deg, transparent 240deg, currentColor 246deg, transparent 254deg, transparent 300deg, currentColor 306deg, transparent 314deg, transparent 360deg)",
                    WebkitMask:
                      "radial-gradient(circle, transparent 40%, black 44%, black 56%, transparent 60%)",
                    mask: "radial-gradient(circle, transparent 40%, black 44%, black 56%, transparent 60%)",
                    color: "currentColor"
                  }}
                  initial={{ rotate: 0, opacity: 0.7 }}
                  animate={{ rotate: 360, opacity: [0.7, 0.4, 0.7] }}
                  transition={{
                    rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                    opacity: { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                  }}
                />
              </span>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </button>
  );
}
