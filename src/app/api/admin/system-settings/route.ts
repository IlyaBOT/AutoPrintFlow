import path from "path";

import sharp from "sharp";

import { getCurrentUser } from "@/lib/auth/session";
import { ACCEPTED_IMAGE_TYPES, MAX_INPUT_PIXELS, MAX_UPLOAD_BYTES } from "@/lib/image/constants";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { STORAGE_DIRS, writeStoredFile } from "@/lib/storage";
import { z } from "zod";

const settingsSchema = z.object({
  instanceName: z.string().trim().min(1).max(80),
  stripeFooterText: z.string().trim().min(1).max(200),
  stripeFooterFontSizePt: z.number().finite().min(8).max(72),
});

export async function POST(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  try {
    const formData = await request.formData();
    const parsedSettings = settingsSchema.parse({
      instanceName: String(formData.get("instanceName") ?? "AutoPrint Flow").trim() || "AutoPrint Flow",
      stripeFooterText:
        String(formData.get("stripeFooterText") ?? "").trim() || 'Printed in "AutoPrint Flow. {year}"',
      stripeFooterFontSizePt: Number(formData.get("stripeFooterFontSizePt") ?? 18),
    });
    const removeInstanceIcon = String(formData.get("removeInstanceIcon") ?? "") === "1";
    const removeStripeBackground = String(formData.get("removeStripeBackground") ?? "") === "1";
    const instanceIcon = formData.get("instanceIcon");
    const stripeBackground = formData.get("stripeBackground");

    const current = await prisma.systemSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });

    let instanceIconFilePath = removeInstanceIcon ? null : current.instanceIconFilePath;
    let stripeBackgroundPath = removeStripeBackground ? null : current.stripeBackgroundPath;

    if (instanceIcon instanceof File && instanceIcon.size > 0) {
      if (!ACCEPTED_IMAGE_TYPES.has(instanceIcon.type) || instanceIcon.size > MAX_UPLOAD_BYTES) {
        return jsonError(t("api.onlyPngJpgWebp"), 422);
      }

      instanceIconFilePath = await writeStoredFile(
        STORAGE_DIRS.settings,
        path.posix.join("instance-icon.png"),
        await sharp(Buffer.from(await instanceIcon.arrayBuffer()), { limitInputPixels: MAX_INPUT_PIXELS })
          .rotate()
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer(),
      );
    }

    if (stripeBackground instanceof File && stripeBackground.size > 0) {
      if (!ACCEPTED_IMAGE_TYPES.has(stripeBackground.type) || stripeBackground.size > MAX_UPLOAD_BYTES) {
        return jsonError(t("api.onlyPngJpgWebp"), 422);
      }

      stripeBackgroundPath = await writeStoredFile(
        STORAGE_DIRS.settings,
        path.posix.join("stripe-background.png"),
        await sharp(Buffer.from(await stripeBackground.arrayBuffer()), { limitInputPixels: MAX_INPUT_PIXELS })
          .rotate()
          .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
          .png()
          .toBuffer(),
      );
    }

    const settings = await prisma.systemSettings.update({
      where: { id: 1 },
      data: {
        instanceName: parsedSettings.instanceName,
        instanceIconFilePath,
        stripeBackgroundPath,
        stripeFooterText: parsedSettings.stripeFooterText,
        stripeFooterFontSizePt: Math.round(parsedSettings.stripeFooterFontSizePt),
      },
    });

    return jsonSuccess({ message: t("systemSettings.saved"), settings });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("systemSettings.saveFailed"), 422);
    }

    console.error(error);
    return jsonError(t("systemSettings.saveFailed"), 500);
  }
}
