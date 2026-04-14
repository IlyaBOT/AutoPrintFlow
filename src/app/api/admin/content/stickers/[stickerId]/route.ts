import { getCurrentUser } from "@/lib/auth/session";
import { deleteStickerWithAssets } from "@/lib/content-maintenance";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ stickerId: string }> }) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  const { stickerId } = await params;

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  await deleteStickerWithAssets(stickerId);
  return jsonSuccess({ message: t("systemSettings.stickerDeleted") });
}
