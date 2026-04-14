import { StickerStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { rejectStickerSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ stickerId: string }> },
) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  const { stickerId } = await context.params;
  const sticker = await prisma.sticker.findUnique({ where: { id: stickerId } });

  if (!sticker) {
    return jsonError(t("api.stickerNotFound"), 404);
  }

  if (sticker.status !== StickerStatus.SUBMITTED) {
    return jsonError(t("api.onlySubmittedCanBeRejected"), 422);
  }

  try {
    const body = await request.json();
    const payload = rejectStickerSchema.parse(body);

    await prisma.sticker.update({
      where: { id: sticker.id },
      data: {
        status: StickerStatus.REJECTED,
        rejectReason: payload.reason,
        approvedAt: null,
      },
    });

    return jsonSuccess({
      success: true,
      message: t("api.stickerRejected"),
    });
  } catch (error) {
    console.error(error);
    return jsonError(t("api.enterRejectReason"), 422);
  }
}
