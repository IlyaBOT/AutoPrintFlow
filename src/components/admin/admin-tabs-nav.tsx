import Link from "next/link";

import { cn } from "@/lib/utils";

export function AdminTabsNav({
  tabs,
  active,
}: {
  tabs: Array<{ href: string; label: string }>;
  active: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-full border border-white/60 bg-white/60 p-1 shadow-soft dark:border-slate-700 dark:bg-slate-950/70">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition",
            active === tab.href
              ? "bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950"
              : "text-slate-600 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-slate-800",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
