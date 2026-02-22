"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import lightImg from "@/assets/light.png";
import darkImg from "@/assets/dark.png";
import systemImg from "@/assets/system.png";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("siesta-theme") as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => { if (theme === "system") applyTheme("system"); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  function pick(t: Theme) {
    setTheme(t);
    localStorage.setItem("siesta-theme", t);
    applyTheme(t);
  }

  return (
    <div className="theme-toggle" aria-label="Tema">
      <button
        className={`theme-toggle-btn${theme === "light" ? " theme-active" : ""}`}
        onClick={() => pick("light")}
        title="Modo claro"
        aria-pressed={theme === "light"}
      >
        <Image src={lightImg} alt="" width={18} height={18} className="theme-toggle-icon" />
      </button>

      <button
        className={`theme-toggle-btn${theme === "system" ? " theme-active" : ""}`}
        onClick={() => pick("system")}
        title="Sistema"
        aria-pressed={theme === "system"}
      >
        <Image src={systemImg} alt="" width={18} height={18} className="theme-toggle-icon" />
      </button>

      <button
        className={`theme-toggle-btn${theme === "dark" ? " theme-active" : ""}`}
        onClick={() => pick("dark")}
        title="Modo oscuro"
        aria-pressed={theme === "dark"}
      >
        <Image src={darkImg} alt="" width={18} height={18} className="theme-toggle-icon" />
      </button>
    </div>
  );
}
