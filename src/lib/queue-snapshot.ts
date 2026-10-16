import type { QueueSheet, QueueStripe } from "@/types/stickers";
export function sheetStickerIds(sheet: QueueSheet) {
  return sheet.stripes.flatMap((stripe) =>
    stripe.stickers.map((sticker) => sticker.id),
  );
}
export function stripeLayoutToken(stripe: QueueStripe) {
  return JSON.stringify([
    stripe.id ?? stripe.index,
    stripe.slots.map((slot) =>
      slot ? [slot.id, slot.updatedAt?.toISOString() ?? null] : null,
    ),
  ]);
}
export function sheetLayoutToken(sheet: QueueSheet) {
  return JSON.stringify(
    sheet.stripes.map((stripe) => JSON.parse(stripeLayoutToken(stripe))),
  );
}
export function matchesSheetSnapshot(
  sheet: QueueSheet,
  ids: string[],
  layout?: string,
) {
  return (
    JSON.stringify(sheetStickerIds(sheet)) === JSON.stringify(ids) &&
    (layout === undefined || sheetLayoutToken(sheet) === layout)
  );
}
export function sheetSnapshotQuery(sheet: QueueSheet) {
  return `ids=${encodeURIComponent(sheetStickerIds(sheet).join(","))}&layout=${encodeURIComponent(sheetLayoutToken(sheet))}`;
}
