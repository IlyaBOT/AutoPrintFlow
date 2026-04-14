import "server-only";

import fs from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import { resolveStoragePath, STORAGE_DIRS } from "@/lib/storage";

async function safeDelete(relativePath: string | null | undefined) {
  if (!relativePath) {
    return;
  }

  try {
    await fs.unlink(resolveStoragePath(relativePath));
  } catch {
    // Ignore missing files.
  }
}

export async function deleteStickerWithAssets(stickerId: string) {
  const sticker = await prisma.sticker.findUnique({
    where: { id: stickerId },
    select: {
      originalFilePath: true,
      finalFilePath: true,
      previewFilePath: true,
    },
  });

  if (!sticker) {
    return;
  }

  await prisma.sticker.delete({ where: { id: stickerId } });
  await Promise.all([
    safeDelete(sticker.originalFilePath),
    safeDelete(sticker.finalFilePath),
    safeDelete(sticker.previewFilePath),
  ]);

  await clearGeneratedQueueAssets();
}

export async function clearGeneratedQueueAssets() {
  const targets = [STORAGE_DIRS.generatedSheets, STORAGE_DIRS.generatedStripes].map((dir) => resolveStoragePath(dir));

  await Promise.all(
    targets.map(async (target) => {
      try {
        const entries = await fs.readdir(target);
        await Promise.all(entries.map((entry) => fs.unlink(path.join(target, entry)).catch(() => undefined)));
      } catch {
        // ignore missing directories
      }
    }),
  );
}
