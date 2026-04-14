import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  banned: z.boolean(),
  reason: z.string().trim().max(300).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  const { userId } = await params;

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  try {
    const payload = schema.parse(await request.json());

    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: payload.banned,
        bannedAt: payload.banned ? new Date() : null,
        banReason: payload.banned ? payload.reason ?? null : null,
      },
    });

    return jsonSuccess({ message: payload.banned ? t("systemSettings.userBanned") : t("systemSettings.userUnbanned") });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("systemSettings.userActionInvalid"), 422);
    }

    return jsonError(t("systemSettings.userActionFailed"), 500);
  }
}
