import "server-only";

import { StickerStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { buildQueueLayout, buildQueueStats } from "@/lib/queue";

export async function getQueueStatsFromDb() {
  const [approvedCount, submittedCount, printedCount] = await prisma.$transaction([
    prisma.sticker.count({
      where: {
        status: StickerStatus.APPROVED,
        printedAt: null,
      },
    }),
    prisma.sticker.count({
      where: {
        status: StickerStatus.SUBMITTED,
      },
    }),
    prisma.sticker.count({
      where: {
        status: StickerStatus.PRINTED,
      },
    }),
  ]);

  return buildQueueStats({
    approvedCount,
    submittedCount,
    printedCount,
  });
}

export async function getApprovedQueueLayout() {
  const stickers = await prisma.sticker.findMany({
    where: {
      status: StickerStatus.APPROVED,
      printedAt: null,
    },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      approvedAt: true,
      submittedAt: true,
      printedAt: true,
      finalFilePath: true,
      previewFilePath: true,
      status: true,
    },
    orderBy: [{ approvedAt: "asc" }, { createdAt: "asc" }],
  });

  return buildQueueLayout(stickers);
}
