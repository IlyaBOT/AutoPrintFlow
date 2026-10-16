import type { QueueStripe } from "@/types/stickers";
export class QueuePlacementError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
  }
}
export function planStickerMove(
  stripes: QueueStripe[],
  ids: string[],
  targetId: string | null,
  targetSlot: number,
  swap = false,
) {
  if (
    !ids.length ||
    ids.length > 8 ||
    new Set(ids).size !== ids.length ||
    !Number.isInteger(targetSlot) ||
    targetSlot < 0 ||
    targetSlot > 7
  )
    throw new QueuePlacementError(
      "Выберите от 1 до 8 разных стикеров и слот от 1 до 8.",
    );
  const selected = ids.map((id) => {
    for (const stripe of stripes) {
      const slot = stripe.slots.findIndex((sticker) => sticker?.id === id);
      if (slot >= 0) return { id, stripeId: stripe.id!, slot };
    }
    throw new QueuePlacementError(
      "Состав очереди изменился. Обновите страницу.",
      409,
    );
  });
  const target = targetId
    ? stripes.find((stripe) => stripe.id === targetId)
    : undefined;
  if (targetId && !target)
    throw new QueuePlacementError(
      "Стрип больше не доступен. Обновите страницу.",
      409,
    );
  const occupied = target?.slots[targetSlot];
  const moves: Array<{ id: string; stripeId: string | null; slot: number }> =
    [];
  if (occupied && !ids.includes(occupied.id)) {
    if (!swap || selected.length !== 1)
      throw new QueuePlacementError(
        "Слот занят. Выберите свободный или обменяйте два стикера местами.",
      );
    moves.push({
      id: occupied.id,
      stripeId: selected[0].stripeId,
      slot: selected[0].slot,
    });
  }
  const available = Array.from(
    { length: 8 - targetSlot },
    (_, index) => index + targetSlot,
  ).filter(
    (slot) =>
      !target?.slots[slot] ||
      ids.includes(target.slots[slot]!.id) ||
      (swap && selected.length === 1 && slot === targetSlot),
  );
  if (available.length < selected.length)
    throw new QueuePlacementError(
      "В выбранной части стрипа недостаточно свободных слотов. Выберите другой слот или новый стрип.",
    );
  selected.forEach((sticker, index) =>
    moves.push({ id: sticker.id, stripeId: targetId, slot: available[index] }),
  );
  return {
    moves,
    manualStripeIds: [
      ...new Set([
        ...selected.map((sticker) => sticker.stripeId),
        ...(targetId ? [targetId] : []),
      ]),
    ],
  };
}
