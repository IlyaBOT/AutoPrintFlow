export const runtime = "nodejs";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { createStickerDraftFromUpload } from "@/lib/stickers";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("Upload a single image file.", 422);
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
    return jsonError(error instanceof Error ? error.message : "Upload failed.", 422);
  }
}
