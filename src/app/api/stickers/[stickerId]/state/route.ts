export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { saveStickerStateAndAssets } from "@/lib/stickers";
import { editorStateSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ stickerId: string }> },
) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user) {
    return jsonError(t("api.authRequired"), 401);
  }

  const { stickerId } = await context.params;
  const sticker = await prisma.sticker.findFirst({
    where: {
      id: stickerId,
      userId: user.id,
    },
  });

  if (!sticker) {
    return jsonError(t("api.stickerNotFound"), 404);
  }

  try {
    const body = await request.json();
    const editorState = editorStateSchema.parse(body.editorState);
    await saveStickerStateAndAssets(sticker, editorState);

    return jsonSuccess({
      success: true,
      message: t("api.draftUpdated"),
    });
  } catch (error) {
    console.error(error);
    return jsonError(error instanceof Error ? error.message : t("api.unableToSaveSticker"), 422);
  }
}
