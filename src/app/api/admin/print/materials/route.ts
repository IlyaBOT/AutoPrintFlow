import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  profileId: z.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  weightGsm: z.number().int().positive().max(2000).nullable().optional(),
  finish: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(300).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  try {
    const body = await request.json();
    const payload = schema.parse(body);

    const profile = await prisma.printProfile.findUnique({ where: { id: payload.profileId } });
    if (!profile) {
      return jsonError(t("printProfiles.profileNotFound"), 404);
    }

    const maxSort = await prisma.printMaterial.aggregate({
      where: { profileId: payload.profileId },
      _max: { sortOrder: true },
    });

    if (payload.isDefault) {
      await prisma.printMaterial.updateMany({
        where: { profileId: payload.profileId },
        data: { isDefault: false },
      });
    }

    await prisma.printMaterial.create({
      data: {
        profileId: payload.profileId,
        name: payload.name,
        weightGsm: payload.weightGsm ?? null,
        finish: payload.finish ?? null,
        description: payload.description ?? null,
        isDefault: Boolean(payload.isDefault),
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });

    return jsonSuccess({ message: t("printProfiles.materialAdded") });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return jsonError(t("printProfiles.materialInvalid"), 422);
    }

    console.error(error);
    return jsonError(t("printProfiles.materialSaveFailed"), 500);
  }
}
