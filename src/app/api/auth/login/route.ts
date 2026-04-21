import { createUserSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { RequestSecurityError, enforceRateLimit, verifyTurnstileToken, getClientIp } from "@/lib/request-security";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { t } = await getTranslator();

  try {
    const body = await request.json();
    const payload = loginSchema.parse(body);
    const clientIp = getClientIp(request);

    await enforceRateLimit({
      key: `auth:login:${clientIp}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      errorMessage: t("api.tooManyRequests"),
    });

    if (payload.website) {
      return jsonError(t("api.botVerificationFailed"), 400);
    }

    await verifyTurnstileToken({
      request,
      token: payload.turnstileToken,
      expectedAction: "login",
      missingTokenMessage: t("api.botVerificationRequired"),
      invalidTokenMessage: t("api.botVerificationFailed"),
    });

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      return jsonError(t("api.authInvalidCredentials"), 401);
    }

    if (user.isBanned) {
      return jsonError(t("api.authBanned"), 403);
    }

    await createUserSession(user.id, request);

    return jsonSuccess({
      success: true,
      redirectTo: user.role === "ADMIN" ? "/admin" : "/dashboard",
    });
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("api.authInvalidFields"), 422);
    }

    console.error(error);
    return jsonError(t("api.loginFailed"), 500);
  }
}
