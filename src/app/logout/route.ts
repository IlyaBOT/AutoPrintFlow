import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { destroyCurrentSession } from "@/lib/auth/session";

async function handleLogout(request: Request) {
  await destroyCurrentSession();
  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

export async function POST(request: Request) {
  return handleLogout(request);
}
