export const runtime = "nodejs";

import { readLimitedFormData } from "@/lib/request-body";
import { MAX_UPLOAD_BYTES } from "@/lib/image/constants";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import {
  RequestSecurityError,
  enforceRateLimit,
  verifyTurnstileToken,
  getClientIp,
} from "@/lib/request-security";
import { createStickerDraftFromUpload } from "@/lib/stickers";

export async function POST(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user) {
    return jsonError(t("api.authRequired"), 401);
  }

  try {
    await enforceRateLimit({
      key: `upload:${user.id}:${getClientIp(request)}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
      errorMessage: t("api.tooManyRequests"),
    });

    const formData = await readLimitedFormData(
      request,
      MAX_UPLOAD_BYTES + 65536,
    );
    const file = formData.get("file");
    const website = String(formData.get("website") ?? "").trim();
    const turnstileToken = String(formData.get("turnstileToken") ?? "").trim();

    if (website) {
      return jsonError(t("api.botVerificationFailed"), 400);
    }

    await verifyTurnstileToken({
      request,
      token: turnstileToken,
      expectedAction: "upload",
      missingTokenMessage: t("api.botVerificationRequired"),
      invalidTokenMessage: t("api.botVerificationFailed"),
    });

    if (!(file instanceof File)) {
      return jsonError(t("api.uploadSingleImage"), 422);
    }

    const sticker = await createStickerDraftFromUpload({
      userId: user.id,
      file,
    });

    return jsonSuccess({
      success: true,
      stickerId: sticker.id,
    });
  } catch (error) {
    if (error instanceof RequestSecurityError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError(
      error instanceof Error ? error.message : t("upload.uploadFailed"),
      422,
    );
  }
}
