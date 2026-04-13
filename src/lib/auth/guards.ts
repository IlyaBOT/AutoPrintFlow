import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export async function requireUserPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminPage() {
  const user = await requireUserPage();

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}
