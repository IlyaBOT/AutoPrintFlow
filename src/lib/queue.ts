import type {
  PrintStripeDefinition,
  QueueSheet,
  QueueStats,
  QueueStickerSummary,
  QueueStripe,
} from "@/types/stickers";
import { STICKERS_PER_STRIPE, STRIPES_PER_SHEET } from "@/lib/image/constants";

export type QueueLayoutOptions = {
  separateCustomers?: boolean;
  stripes?: PrintStripeDefinition[];
};
export function getQueueCounts(totalApprovedStickers: number) {
  const totalStripes = Math.ceil(totalApprovedStickers / STICKERS_PER_STRIPE);
  return {
    totalApprovedStickers,
    totalStripes,
    totalSheets: Math.ceil(totalStripes / STRIPES_PER_SHEET),
  };
}
export function buildQueueLayout(
  stickers: QueueStickerSummary[],
  options: QueueLayoutOptions = {},
) {
  const separateCustomers = options.separateCustomers ?? true;
  const sorted = [...stickers].sort(
    (a, b) =>
      (a.approvedAt ?? a.createdAt).getTime() -
        (b.approvedAt ?? b.createdAt).getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );
  const rows = (options.stripes ?? []).map((definition) => ({
    ...definition,
    slots: Array<QueueStickerSummary | null>(STICKERS_PER_STRIPE).fill(null),
  }));
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const unassigned: QueueStickerSummary[] = [];
  for (const sticker of sorted) {
    const row = sticker.printStripeId
      ? rowById.get(sticker.printStripeId)
      : undefined;
    if (
      row &&
      sticker.printSlot != null &&
      sticker.printSlot >= 0 &&
      sticker.printSlot < STICKERS_PER_STRIPE &&
      !row.slots[sticker.printSlot]
    )
      row.slots[sticker.printSlot] = sticker;
    else unassigned.push(sticker);
  }
  let nextPosition = Math.max(0, ...rows.map((row) => row.position)) + 1;
  for (const sticker of unassigned) {
    const customerId = separateCustomers ? sticker.userId : null;
    let row = rows.find(
      (item) =>
        !item.isManual &&
        item.customerId === customerId &&
        item.slots.includes(null),
    );
    if (!row) {
      row = {
        id: `pending:${nextPosition}`,
        position: nextPosition++,
        customerId,
        label: null,
        isManual: false,
        slots: Array<QueueStickerSummary | null>(STICKERS_PER_STRIPE).fill(
          null,
        ),
      };
      rows.push(row);
    }
    row.slots[row.slots.indexOf(null)] = sticker;
  }
  const stripes: QueueStripe[] = rows
    .filter((row) => row.slots.some(Boolean))
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
    .map((row, index) => {
      const occupied = row.slots.filter(
        (item): item is QueueStickerSummary => item !== null,
      );
      return {
        ...row,
        index: index + 1,
        sheetIndex: Math.floor(index / STRIPES_PER_SHEET) + 1,
        positionInSheet: index % STRIPES_PER_SHEET,
        stickers: occupied,
        stickerCount: occupied.length,
      };
    });
  const sheets: QueueSheet[] = [];
  for (let index = 0; index < stripes.length; index += STRIPES_PER_SHEET) {
    const chunk = stripes.slice(index, index + STRIPES_PER_SHEET);
    sheets.push({
      index: sheets.length + 1,
      stripes: chunk,
      stripeCount: chunk.length,
      stickerCount: chunk.reduce((sum, stripe) => sum + stripe.stickerCount, 0),
    });
  }
  return { stripes, sheets, separateCustomers };
}
export function buildQueueStats(params: {
  approvedCount: number;
  submittedCount: number;
  printedCount: number;
  layout?: { stripes: QueueStripe[]; sheets: QueueSheet[] };
}): QueueStats {
  const counts = getQueueCounts(params.approvedCount);
  return {
    ...counts,
    ...(params.layout
      ? {
          totalStripes: params.layout.stripes.length,
          totalSheets: params.layout.sheets.length,
        }
      : {}),
    submittedCount: params.submittedCount,
    approvedWaitingCount: params.approvedCount,
    printedCount: params.printedCount,
  };
}
