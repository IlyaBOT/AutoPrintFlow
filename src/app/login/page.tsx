import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="page-shell">
      <div className="space-y-6 py-10">
        <AuthForm mode="login" />
        <p className="text-center text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/register" className="font-semibold text-sky-700">
            Register here
          </Link>
        </p>
      </div>
    </main>
  );
}
