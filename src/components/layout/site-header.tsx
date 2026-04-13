import Link from "next/link";
import { Sparkles } from "lucide-react";

import { getCurrentUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="page-shell pb-0">
      <div className="glass-panel flex items-center justify-between rounded-[32px] px-5 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-slate-900">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700/75">
              AutoPrintFlow
            </div>
            <div className="text-sm text-slate-600">Online sticker print workflow</div>
          </div>
        </Link>

        <nav className="flex items-center gap-3">
          <Link href="/" className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-950 sm:block">
            Overview
          </Link>
          {user ? (
            <>
              <Link
                href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="hidden text-sm font-medium text-slate-600 transition hover:text-slate-950 sm:block"
              >
                {user.role === "ADMIN" ? "Admin" : "Dashboard"}
              </Link>
              <Button asChild size="sm" variant="secondary">
                <Link href="/editor/new">Create layout</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/logout" prefetch={false}>
                  Logout
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Create account</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
