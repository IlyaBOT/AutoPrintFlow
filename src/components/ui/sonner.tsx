"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      expand
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !shadow-panel !bg-white !text-slate-900 dark:!border-slate-700 dark:!bg-slate-900 dark:!text-slate-100",
          title: "!font-semibold !opacity-100 !text-inherit",
          description: "!opacity-100 !text-inherit",
          error:
            "!border-red-700 !bg-red-600 !text-white dark:!border-red-800 dark:!bg-red-900 dark:!text-red-50",
          success:
            "!border-sky-600 !bg-sky-400 !text-slate-950 dark:!border-sky-800 dark:!bg-sky-950 dark:!text-sky-50",
        },
      }}
    />
  );
}
