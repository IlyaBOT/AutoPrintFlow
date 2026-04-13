export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { submitSticker } from "@/lib/stickers";
import { editorStateSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ stickerId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  const { stickerId } = await context.params;
  const sticker = await prisma.sticker.findFirst({
    where: {
      id: stickerId,
      userId: user.id,
    },
  });

  if (!sticker) {
    return jsonError("Sticker not found.", 404);
  }

  try {
    const body = await request.json();
    const editorState = editorStateSchema.parse(body.editorState);
    await submitSticker(sticker, editorState);

    return jsonSuccess({
      success: true,
      message: "Sticker submitted for moderation.",
    });
  } catch (error) {
    console.error(error);
    return jsonError(error instanceof Error ? error.message : "Unable to submit sticker.", 422);
  }
}
