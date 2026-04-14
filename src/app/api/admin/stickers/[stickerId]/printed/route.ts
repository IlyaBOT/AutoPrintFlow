import { StickerStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
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

  if (sticker.status !== StickerStatus.APPROVED) {
    return jsonError(t("api.onlyApprovedCanBePrinted"), 422);
  }

  await prisma.sticker.update({
    where: { id: sticker.id },
    data: {
      status: StickerStatus.PRINTED,
      printedAt: new Date(),
    },
  });

  return jsonSuccess({
    success: true,
    message: t("api.stickerArchivedPrinted"),
  });
}
