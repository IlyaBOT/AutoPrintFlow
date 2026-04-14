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
            "!rounded-2xl !border !shadow-panel !bg-white !text-slate-900 dark:!border-slate-700 dark:!bg-slate-900 dark:!text-slate-100 [&[data-type=error]]:!border-red-700 [&[data-type=error]]:!bg-red-600 [&[data-type=error]]:!text-white dark:[&[data-type=error]]:!border-red-800 dark:[&[data-type=error]]:!bg-red-900 dark:[&[data-type=error]]:!text-red-50 [&[data-type=success]]:!border-sky-600 [&[data-type=success]]:!bg-sky-400 [&[data-type=success]]:!text-slate-950 dark:[&[data-type=success]]:!border-sky-800 dark:[&[data-type=success]]:!bg-sky-950 dark:[&[data-type=success]]:!text-sky-50",
          title: "!font-semibold !opacity-100 !text-inherit",
          description: "!opacity-100 !text-inherit",
        },
      }}
    />
  );
}
