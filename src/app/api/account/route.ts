import { z } from "zod";

import { deleteUserWithContent } from "@/lib/account-maintenance";
import { destroyCurrentSession, getCurrentUser } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  password: z.string().min(8).max(200),
});

export async function DELETE(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user) {
    return jsonError(t("api.authRequired"), 401);
  }

  try {
    const payload = schema.parse(await request.json());
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

    if (!dbUser || !(await verifyPassword(payload.password, dbUser.passwordHash))) {
      return jsonError(t("account.invalidPassword"), 403);
    }

    await destroyCurrentSession();
    await deleteUserWithContent(user.id);

    return jsonSuccess({ message: t("account.accountDeleted"), redirectTo: "/register" });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("account.passwordInvalid"), 422);
    }

    return jsonError(t("account.accountDeleteFailed"), 500);
  }
}
