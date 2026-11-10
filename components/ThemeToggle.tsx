"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { onThemeChange, readTheme, setTheme, type Theme } from "@/lib/theme";
import { play } from "@/lib/fx/sound";
import { vibrate } from "@/lib/fx/haptics";

export const iconButtonClass =
  "grid size-10 shrink-0 place-items-center rounded-full border border-malt/15 bg-white/70 text-malt shadow-sm hover:bg-white active:scale-95 dark:border-nightBorder dark:bg-nightSurface2/70 dark:text-nightText dark:hover:bg-nightSurface2";

export default function ThemeToggle({ className = iconButtonClass }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(readTheme());
    return onThemeChange(setThemeState);
  }, []);

  const toggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
    play("click");
    vibrate("tap");
  };

  const label = theme === "dark" ? "Zum hellen Design wechseln" : "Zum dunklen Design wechseln";
  return (
    <button type="button" onClick={toggle} title={label} aria-label={label} className={className}>
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
