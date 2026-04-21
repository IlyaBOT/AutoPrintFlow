import { z } from "zod";

import { createUserSession, destroyUserSessions, getCurrentUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  currentPassword: z.string().min(8).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function PATCH(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user) {
    return jsonError(t("api.authRequired"), 401);
  }

  try {
    const payload = schema.parse(await request.json());
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

    if (!dbUser || !(await verifyPassword(payload.currentPassword, dbUser.passwordHash))) {
      return jsonError(t("account.invalidPassword"), 403);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(payload.newPassword) },
    });
    await destroyUserSessions(user.id);
    await createUserSession(user.id, request);

    return jsonSuccess({ message: t("account.passwordUpdated") });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("account.passwordInvalid"), 422);
    }

    return jsonError(t("account.passwordUpdateFailed"), 500);
  }
}
