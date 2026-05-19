"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className={cn("w-9 h-9 rounded-lg skeleton", className)} />
    );
  }

  const themes = [
    { value: "light", icon: Sun, label: "Svijetla" },
    { value: "dark", icon: Moon, label: "Tamna" },
    { value: "system", icon: Monitor, label: "Sistem" },
  ];

  const current = themes.find((t) => t.value === theme) || themes[2];
  const Icon = current.icon;

  const cycle = () => {
    const idx = themes.findIndex((t) => t.value === theme);
    setTheme(themes[(idx + 1) % themes.length].value);
  };

  return (
    <button
      onClick={cycle}
      className={cn(
        "w-9 h-9 flex items-center justify-center rounded-lg",
        "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        "transition-all duration-200",
        className
      )}
      title={`Tema: ${current.label}`}
      aria-label="Promijeni temu"
    >
      <Icon size={18} />
    </button>
  );
}
