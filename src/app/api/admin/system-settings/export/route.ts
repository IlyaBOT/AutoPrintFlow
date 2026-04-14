import { getCurrentUser } from "@/lib/auth/session";
import { exportDatabaseSql } from "@/lib/db-backup";
import { jsonError } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";

export async function GET() {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  try {
    const sql = await exportDatabaseSql();
    const fileName = `autoprintflow-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;

    return new Response(new Uint8Array(sql), {
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return jsonError(t("systemSettings.exportFailed"), 500);
  }
}
