import "server-only";

import crypto from "crypto";

import type { Role, User } from "@prisma/client";
import { cookies } from "next/headers";

import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION_DAYS = 30;
const SESSION_TOUCH_WINDOW_MS = 1000 * 60 * 30;

type SessionUser = Pick<User, "id" | "name" | "email" | "role" | "createdAt" | "updatedAt">;

export type AuthSession = {
  id: string;
  user: SessionUser;
  expiresAt: Date;
};

function getSessionExpiry() {
  return new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
}

function shouldUseSecureCookies(request?: Request) {
  const forwardedProto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();

  if (forwardedProto === "https") {
    return true;
  }

  if (forwardedProto === "http") {
    return false;
  }

  if (request) {
    try {
      return new URL(request.url).protocol === "https:";
    } catch {
      return false;
    }
  }

  const appOrigin = getEnv().APP_ORIGIN?.trim().toLowerCase();
  return appOrigin?.startsWith("https://") ?? false;
}

export function hashSessionToken(token: string) {
  const secret = getEnv().SESSION_SECRET;
  return crypto.createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createUserSession(userId: string, request?: Request) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpiry();
  const cookieStore = await cookies();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      lastUsedAt: new Date(),
    },
  });

  cookieStore.set({
    name: getEnv().SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    expires: expiresAt,
  });
}

async function loadSessionFromCookie() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(getEnv().SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBanned: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date() || session.user.isBanned) {
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > SESSION_TOUCH_WINDOW_MS) {
    void prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return {
    id: session.id,
    expiresAt: session.expiresAt,
    user: session.user,
  } satisfies AuthSession;
}

export async function getCurrentSession() {
  return loadSessionFromCookie();
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export async function destroyCurrentSession(request?: Request) {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(getEnv().SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(rawToken),
      },
    });
  }

  cookieStore.set({
    name: getEnv().SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 0,
  });
}

export async function destroyUserSessions(userId: string) {
  await prisma.session.deleteMany({
    where: {
      userId,
    },
  });
}

export async function isAuthenticated() {
  return Boolean(await getCurrentUser());
}

export async function hasRole(role: Role) {
  const user = await getCurrentUser();
  return user?.role === role;
}
