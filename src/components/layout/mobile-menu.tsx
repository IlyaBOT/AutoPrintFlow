"use client";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
export function MobileMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <details
      className="relative md:hidden"
      onClick={(event) => {
        if (event.target instanceof Element && event.target.closest("a"))
          event.currentTarget.open = false;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        aria-label={label}
        className="flex h-11 w-10 cursor-pointer list-none items-center justify-center rounded-full bg-white/60 dark:bg-slate-800"
      >
        <Menu size={20} />
      </summary>
      {children}
    </details>
  );
}
