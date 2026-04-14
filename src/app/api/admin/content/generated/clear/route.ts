import { getCurrentUser } from "@/lib/auth/session";
import { clearGeneratedQueueAssets } from "@/lib/content-maintenance";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";

export async function POST() {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  await clearGeneratedQueueAssets();
  return jsonSuccess({ message: t("systemSettings.generatedCleared") });
}
