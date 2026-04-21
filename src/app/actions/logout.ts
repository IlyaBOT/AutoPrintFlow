"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { destroyCurrentSession } from "@/lib/auth/session";

export async function logoutAction() {
  await destroyCurrentSession();
  revalidatePath("/", "layout");
  redirect("/");
}
