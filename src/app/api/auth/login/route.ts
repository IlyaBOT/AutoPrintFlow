import { createUserSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { t } = await getTranslator();

  try {
    const body = await request.json();
    const payload = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      return jsonError(t("api.authInvalidCredentials"), 401);
    }

    if (user.isBanned) {
      return jsonError(t("api.authBanned"), 403);
    }

    await createUserSession(user.id);

    return jsonSuccess({
      success: true,
      redirectTo: user.role === "ADMIN" ? "/admin" : "/dashboard",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("api.authInvalidFields"), 422);
    }

    console.error(error);
    return jsonError(t("api.loginFailed"), 500);
  }
}
