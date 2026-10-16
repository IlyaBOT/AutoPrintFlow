import { StickerStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { ensureQueueLayout, withQueueLock } from "@/lib/queue-data";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
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
    return jsonError(t("api.onlySubmittedCanBeApproved"), 422);
  }

  const updated = await withQueueLock(async (tx) => {
    const result = await tx.sticker.updateMany({
      where: { id: sticker.id, status: StickerStatus.SUBMITTED },
      data: {
        status: StickerStatus.APPROVED,
        approvedAt: new Date(),
        rejectReason: null,
      },
    });

    if (result.count === 1) await ensureQueueLayout(tx);
    return result;
  });

  if (updated.count !== 1)
    return jsonError("Order changed; reload this page.", 409);

  return jsonSuccess({
    success: true,
    message: t("api.stickerApproved"),
  });
}
