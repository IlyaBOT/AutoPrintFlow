import "server-only";

import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { getEnv } from "@/lib/env";

export class RequestSecurityError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RequestSecurityError";
    this.status = status;
  }
}

function normalizeForwardedIp(value: string) {
  return value
    .split(",")[0]
    ?.trim()
    .replace(/^\[|\]$/g, "");
}

export function getClientIp(request: Request) {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for"),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeForwardedIp(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return "unknown";
}

export function getTurnstileSiteKey() {
  return getEnv().TURNSTILE_SITE_KEY ?? null;
}

export function isTurnstileEnabled() {
  const env = getEnv();
  return Boolean(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET_KEY);
}

export async function enforceRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
  errorMessage: string;
}) {
  const resetAt = new Date(Date.now() + params.windowMs);
  const [result] = await prisma.$queryRaw<Array<{ hitCount: number }>>`
    INSERT INTO "RateLimitBucket" ("key", "hitCount", "resetAt", "createdAt", "updatedAt")
    VALUES (${params.key}, 1, ${resetAt}, NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE
    SET
      "hitCount" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1
        ELSE "RateLimitBucket"."hitCount" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${resetAt}
        ELSE "RateLimitBucket"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "hitCount"
  `;

  if ((result?.hitCount ?? 0) > params.limit) {
    throw new RequestSecurityError(params.errorMessage, 429);
  }
}

export async function verifyTurnstileToken(params: {
  request: Request;
  token: string | null | undefined;
  expectedAction?: string;
  missingTokenMessage: string;
  invalidTokenMessage: string;
}) {
  const secretKey = getEnv().TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    return;
  }

  const token = params.token?.trim();

  if (!token) {
    throw new RequestSecurityError(params.missingTokenMessage, 400);
  }

  const payload = new FormData();
  payload.set("secret", secretKey);
  payload.set("response", token);
  payload.set("idempotency_key", crypto.randomUUID());

  const clientIp = getClientIp(params.request);

  if (clientIp !== "unknown") {
    payload.set("remoteip", clientIp);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: payload,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new RequestSecurityError(params.invalidTokenMessage, 400);
  }

  const result = (await response.json()) as {
    success?: boolean;
    action?: string;
  };

  if (!result.success) {
    throw new RequestSecurityError(params.invalidTokenMessage, 400);
  }

  if (params.expectedAction && result.action && result.action !== params.expectedAction) {
    throw new RequestSecurityError(params.invalidTokenMessage, 400);
  }
}
