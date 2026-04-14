import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function LoginPage() {
  const [user, locale] = await Promise.all([getCurrentUser(), getLocale()]);
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="page-shell">
      <div className="space-y-6 py-10">
        <AuthForm mode="login" />
        <p className="text-center text-sm text-slate-600">
          {t("auth.needAccount")}{" "}
          <Link href="/register" className="font-semibold text-sky-700">
            {t("auth.registerHere")}
          </Link>
        </p>
      </div>
    </main>
  );
}
