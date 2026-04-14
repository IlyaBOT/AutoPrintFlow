import "server-only";

import fs from "fs/promises";

import { clearGeneratedQueueAssets } from "@/lib/content-maintenance";
import { prisma } from "@/lib/prisma";
import { resolveStoragePath } from "@/lib/storage";

async function safeDelete(relativePath: string | null | undefined) {
  if (!relativePath) {
    return;
  }

  try {
    await fs.unlink(resolveStoragePath(relativePath));
  } catch {
    // Ignore missing files during cleanup.
  }
}

export async function deleteUserWithContent(userId: string) {
  const stickers = await prisma.sticker.findMany({
    where: { userId },
    select: {
      originalFilePath: true,
      finalFilePath: true,
      previewFilePath: true,
    },
  });

  await prisma.user.delete({
    where: { id: userId },
  });

  await Promise.all(
    stickers.flatMap((sticker) => [
      safeDelete(sticker.originalFilePath),
      safeDelete(sticker.finalFilePath),
      safeDelete(sticker.previewFilePath),
    ]),
  );

  await clearGeneratedQueueAssets();
}
