import type { QueueSheet, QueueStats, QueueStickerSummary, QueueStripe } from "@/types/stickers";
import { STICKERS_PER_STRIPE, STRIPES_PER_SHEET } from "@/lib/image/constants";

export function getQueueCounts(totalApprovedStickers: number) {
  const totalStripes = Math.ceil(totalApprovedStickers / STICKERS_PER_STRIPE);
  const totalSheets = Math.ceil(totalStripes / STRIPES_PER_SHEET);

  return {
    totalApprovedStickers,
    totalStripes,
    totalSheets,
  };
}

export function buildQueueLayout(stickers: QueueStickerSummary[]) {
  const sorted = [...stickers].sort((left, right) => {
    const leftTime = left.approvedAt?.getTime() ?? left.createdAt.getTime();
    const rightTime = right.approvedAt?.getTime() ?? right.createdAt.getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });

  const stripes: QueueStripe[] = [];
  const sheets: QueueSheet[] = [];

  for (let index = 0; index < sorted.length; index += STICKERS_PER_STRIPE) {
    const chunk = sorted.slice(index, index + STICKERS_PER_STRIPE);
    const stripeIndex = stripes.length + 1;
    const sheetIndex = Math.floor((stripeIndex - 1) / STRIPES_PER_SHEET) + 1;
    const positionInSheet = (stripeIndex - 1) % STRIPES_PER_SHEET;

    stripes.push({
      index: stripeIndex,
      sheetIndex,
      positionInSheet,
      stickers: chunk,
      slots: Array.from({ length: STICKERS_PER_STRIPE }, (_, slotIndex) => chunk[slotIndex] ?? null),
      stickerCount: chunk.length,
    });
  }

  for (let index = 0; index < stripes.length; index += STRIPES_PER_SHEET) {
    const chunk = stripes.slice(index, index + STRIPES_PER_SHEET);

    sheets.push({
      index: sheets.length + 1,
      stripes: chunk,
      stripeCount: chunk.length,
      stickerCount: chunk.reduce((total, stripe) => total + stripe.stickerCount, 0),
    });
  }

  return { stripes, sheets };
}

export function buildQueueStats(params: {
  approvedCount: number;
  submittedCount: number;
  printedCount: number;
}): QueueStats {
  const counts = getQueueCounts(params.approvedCount);

  return {
    ...counts,
    submittedCount: params.submittedCount,
    approvedWaitingCount: params.approvedCount,
    printedCount: params.printedCount,
  };
}
