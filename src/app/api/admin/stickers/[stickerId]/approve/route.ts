import { StickerStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ stickerId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError("Admin access required.", 403);
  }

  const { stickerId } = await context.params;
  const sticker = await prisma.sticker.findUnique({ where: { id: stickerId } });

  if (!sticker) {
    return jsonError("Sticker not found.", 404);
  }

  if (sticker.status !== StickerStatus.SUBMITTED) {
    return jsonError("Only submitted stickers can be approved.", 422);
  }

  await prisma.sticker.update({
    where: { id: sticker.id },
    data: {
      status: StickerStatus.APPROVED,
      approvedAt: new Date(),
      rejectReason: null,
    },
  });

  return jsonSuccess({
    success: true,
    message: "Sticker approved.",
  });
}
