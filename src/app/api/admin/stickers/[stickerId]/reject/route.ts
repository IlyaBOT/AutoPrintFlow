import { StickerStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { rejectStickerSchema } from "@/lib/validation";

export async function POST(
  request: Request,
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
    return jsonError("Only submitted stickers can be rejected.", 422);
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
      message: "Sticker rejected.",
    });
  } catch (error) {
    console.error(error);
    return jsonError("Enter a reject reason.", 422);
  }
}
