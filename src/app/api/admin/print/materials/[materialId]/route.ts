import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  const { materialId } = await params;

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  await prisma.printMaterial.delete({ where: { id: Number(materialId) } });
  return jsonSuccess({ message: t("printProfiles.materialDeleted") });
}
