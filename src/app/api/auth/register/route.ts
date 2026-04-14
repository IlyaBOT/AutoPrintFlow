import { Prisma } from "@prisma/client";

import { createUserSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { t } = await getTranslator();

  try {
    const body = await request.json();
    const payload = registerSchema.parse(body);

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash: await hashPassword(payload.password),
      },
    });

    await createUserSession(user.id);

    return jsonSuccess({
      success: true,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(t("api.authAccountExists"), 409);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("api.authRegisterInvalid"), 422);
    }

    console.error(error);
    return jsonError(t("api.registrationFailed"), 500);
  }
}
