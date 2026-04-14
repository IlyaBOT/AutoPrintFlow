import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200).transform((value) => value.toLowerCase()),
});

export async function PATCH(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user) {
    return jsonError(t("api.authRequired"), 401);
  }

  try {
    const payload = schema.parse(await request.json());

    await prisma.user.update({
      where: { id: user.id },
      data: payload,
    });

    return jsonSuccess({ message: t("account.profileUpdated") });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("account.profileInvalid"), 422);
    }

    return jsonError(t("account.profileUpdateFailed"), 500);
  }
}
