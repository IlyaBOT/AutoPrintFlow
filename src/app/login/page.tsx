import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth/auth-panel";
import { getCurrentUser } from "@/lib/auth/session";
import { getTurnstileSiteKey } from "@/lib/request-security";

export default async function LoginPage() {
  const [user, turnstileSiteKey] = await Promise.all([getCurrentUser(), Promise.resolve(getTurnstileSiteKey())]);

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="page-shell">
      <AuthPanel initialMode="login" turnstileSiteKey={turnstileSiteKey} />
    </main>
  );
}
