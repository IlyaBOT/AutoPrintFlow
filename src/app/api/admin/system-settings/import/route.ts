import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { importDatabaseSql } from "@/lib/db-backup";

export async function POST(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return jsonError(t("systemSettings.importMissingFile"), 422);
    }

    await importDatabaseSql(Buffer.from(await file.arrayBuffer()));
    return jsonSuccess({ message: t("systemSettings.imported") });
  } catch (error) {
    console.error(error);
    return jsonError(t("systemSettings.importFailed"), 500);
  }
}
