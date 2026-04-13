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
          toast: "!rounded-2xl !border !border-white/60 !bg-white/90 !text-slate-900 !shadow-panel",
          title: "!font-semibold",
          description: "!text-slate-600",
        },
      }}
    />
  );
}
