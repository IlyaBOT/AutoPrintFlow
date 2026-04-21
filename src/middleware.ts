import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function buildExpectedOrigin(request: NextRequest) {
  const envOrigin = process.env.APP_ORIGIN?.trim();

  if (envOrigin) {
    return envOrigin;
  }

  const protocol = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;

  return `${protocol}://${host}`;
}

function extractRequestOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer");

  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const isStateChanging = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  const protectedPath = request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname === "/logout";

  if (!protectedPath || !isStateChanging) {
    return NextResponse.next();
  }

  const requestOrigin = extractRequestOrigin(request);
  const expectedOrigin = buildExpectedOrigin(request);

  if (!requestOrigin) {
    const fetchSite = request.headers.get("sec-fetch-site");

    if (fetchSite === "same-origin") {
      return NextResponse.next();
    }

    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  if (requestOrigin !== expectedOrigin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/logout"],
};
