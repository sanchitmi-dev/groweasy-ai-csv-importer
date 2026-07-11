import type { ReactNode } from "react";

type ThemeToggleProps = {
  isDark: boolean;
  onToggle: () => void;
  icon: ReactNode;
};

export function ThemeToggle({ isDark, onToggle, icon }: ThemeToggleProps) {
  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={onToggle}
      className="grid h-10 w-10 place-items-center rounded-md border border-black/10 bg-white text-ink transition hover:border-mint hover:text-mint dark:border-white/12 dark:bg-white/8 dark:text-white"
    >
      {icon}
    </button>
  );
}
