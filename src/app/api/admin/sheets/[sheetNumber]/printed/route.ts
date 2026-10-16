import { z } from "zod";
import { matchesSheetSnapshot } from "@/lib/queue-snapshot";
import { StickerStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { ensureQueueLayout, withQueueLock } from "@/lib/queue-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sheetNumber: string }> },
) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  const { sheetNumber } = await params;

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  const sheetIndex = Number(sheetNumber);
  if (!Number.isInteger(sheetIndex) || sheetIndex < 1) {
    return jsonError(t("api.sheetNumberInvalid"), 400);
  }

  const payload = z
    .object({
      stickerIds: z.array(z.string().min(1).max(100)).min(1).max(24),
      layout: z.string().max(10000).optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!payload.success)
    return jsonError("Expected the sticker IDs shown on the sheet.", 422);
  try {
    await withQueueLock(async (tx) => {
      const sheet = (await ensureQueueLayout(tx)).sheets[sheetIndex - 1];
      if (
        !sheet ||
        !payload.data.layout ||
        !matchesSheetSnapshot(
          sheet,
          payload.data.stickerIds,
          payload.data.layout,
        )
      )
        throw new Error("Queue changed");
      const result = await tx.sticker.updateMany({
        where: {
          id: { in: payload.data.stickerIds },
          status: StickerStatus.APPROVED,
          printedAt: null,
        },
        data: {
          status: StickerStatus.PRINTED,
          printedAt: new Date(),
          printStripeId: null,
          printSlot: null,
        },
      });
      if (result.count !== payload.data.stickerIds.length)
        throw new Error("Queue changed");
    });
  } catch {
    return jsonError(
      "Очередь изменилась. Обновите страницу. / Queue changed; reload this page.",
      409,
    );
  }

  return jsonSuccess({ message: t("admin.sheetMarkedPrinted") });
}
