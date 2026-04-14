"use client";

import { useState } from "react";

import { useI18n } from "@/components/providers/i18n-provider";
import { AuthForm } from "@/components/auth/auth-form";

export function AuthPanel({ initialMode }: { initialMode: "login" | "register" }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  return (
    <div className="space-y-6 py-10">
      <AuthForm mode={mode} />
      {mode === "login" ? (
        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          {t("auth.noAccount")} {" "}
          <button type="button" className="font-semibold text-sky-700 dark:text-sky-300" onClick={() => setMode("register")}>
            {t("auth.registerHere")}
          </button>
        </p>
      ) : (
        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          {t("auth.alreadyHaveAccount")} {" "}
          <button type="button" className="font-semibold text-sky-700 dark:text-sky-300" onClick={() => setMode("login")}>
            {t("auth.loginLink")}
          </button>
        </p>
      )}
    </div>
  );
}
