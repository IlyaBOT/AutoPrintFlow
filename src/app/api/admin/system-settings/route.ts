import path from "path";

import { getCurrentUser } from "@/lib/auth/session";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/image/constants";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { STORAGE_DIRS, writeStoredFile } from "@/lib/storage";

export async function POST(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  try {
    const formData = await request.formData();
    const instanceName = String(formData.get("instanceName") ?? "AutoPrint Flow").trim() || "AutoPrint Flow";
    const stripeFooterText = String(formData.get("stripeFooterText") ?? "").trim() || 'Printed in "AutoPrint Flow. {year}"';
    const stripeFooterFontSizePt = Number(formData.get("stripeFooterFontSizePt") ?? 18);
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
        path.posix.join(`instance-icon${path.extname(instanceIcon.name || ".png")}`),
        Buffer.from(await instanceIcon.arrayBuffer()),
      );
    }

    if (stripeBackground instanceof File && stripeBackground.size > 0) {
      if (!ACCEPTED_IMAGE_TYPES.has(stripeBackground.type) || stripeBackground.size > MAX_UPLOAD_BYTES) {
        return jsonError(t("api.onlyPngJpgWebp"), 422);
      }

      stripeBackgroundPath = await writeStoredFile(
        STORAGE_DIRS.settings,
        path.posix.join(`stripe-background${path.extname(stripeBackground.name || ".png")}`),
        Buffer.from(await stripeBackground.arrayBuffer()),
      );
    }

    const settings = await prisma.systemSettings.update({
      where: { id: 1 },
      data: {
        instanceName,
        instanceIconFilePath,
        stripeBackgroundPath,
        stripeFooterText,
        stripeFooterFontSizePt: Number.isFinite(stripeFooterFontSizePt)
          ? Math.max(8, Math.min(72, Math.round(stripeFooterFontSizePt)))
          : 18,
      },
    });

    return jsonSuccess({ message: t("systemSettings.saved"), settings });
  } catch (error) {
    console.error(error);
    return jsonError(t("systemSettings.saveFailed"), 500);
  }
}
