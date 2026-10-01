"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Read preference on load
    const stored = localStorage.getItem("wp-dispatcher-theme");
    const dark = stored
      ? stored === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = !isDark;
    const nextTheme = next ? "dark" : "light";
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", nextTheme);

    try {
      localStorage.setItem("wp-dispatcher-theme", nextTheme);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      onClick={toggle}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: "1px solid #9ca3af",
        background: isDark ? "#111827" : "#e5e7eb",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        display: "inline-block",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: isDark ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: isDark ? "#facc15" : "#ffffff",
          transition: "left .15s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,.25)",
          pointerEvents: "none",
        }}
      />
    </button>
  );
}