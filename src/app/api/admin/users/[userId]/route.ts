import { deleteUserWithContent } from "@/lib/account-maintenance";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  const { userId } = await params;

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  if (userId === user.id) {
    return jsonError(t("systemSettings.cannotDeleteSelf"), 400);
  }

  await deleteUserWithContent(userId);
  return jsonSuccess({ message: t("systemSettings.userDeleted") });
}
