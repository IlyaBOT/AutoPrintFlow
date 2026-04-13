import { NextResponse } from "next/server";

import { destroyCurrentSession } from "@/lib/auth/session";

async function handleLogout(request: Request) {
  await destroyCurrentSession();
  return NextResponse.redirect(new URL("/", request.url));
}

export async function GET(request: Request) {
  return handleLogout(request);
}

export async function POST(request: Request) {
  return handleLogout(request);
}
