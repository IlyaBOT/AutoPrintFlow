export const runtime = "nodejs";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { createStickerDraftFromUpload } from "@/lib/stickers";

export async function POST(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user) {
    return jsonError(t("api.authRequired"), 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError(t("api.uploadSingleImage"), 422);
  }

  try {
    const sticker = await createStickerDraftFromUpload({
      userId: user.id,
      file,
    });

    return jsonSuccess({
      success: true,
      stickerId: sticker.id,
    });
  } catch (error) {
    console.error(error);
    return jsonError(error instanceof Error ? error.message : t("upload.uploadFailed"), 422);
  }
}
