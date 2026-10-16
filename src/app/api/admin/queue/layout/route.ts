import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError, jsonSuccess } from "@/lib/http";
import {
  activeQueueWhere,
  ensureQueueLayout,
  getApprovedQueueLayout,
  getQueueRevision,
  queueManagerData,
  withQueueLock,
} from "@/lib/queue-data";
import { planStickerMove, QueuePlacementError } from "@/lib/queue-placement";
const stickerIds = z.array(z.string().min(1).max(100)).min(1).max(8);
const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("move"),
    revision: z.string().length(64),
    stickerIds,
    targetStripeId: z.string().max(100).nullable(),
    targetSlot: z.number().int().min(0).max(7),
    swap: z.boolean().default(false),
    label: z.string().trim().max(80).optional(),
  }),
  z.object({
    action: z.literal("grouping"),
    revision: z.string().length(64),
    separateCustomers: z.boolean(),
  }),
  z.object({
    action: z.literal("automatic"),
    revision: z.string().length(64),
    stickerIds,
  }),
  z.object({
    action: z.literal("rename"),
    revision: z.string().length(64),
    stripeId: z.string().min(1).max(100),
    label: z.string().trim().max(80),
  }),
]);
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return jsonError("Admin access required", 403);
  return jsonSuccess(queueManagerData(await getApprovedQueueLayout()));
}
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return jsonError("Admin access required", 403);
  const payload = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!payload.success)
    return jsonError(
      "Проверьте параметры переноса. / Invalid layout request.",
      422,
    );
  const input = payload.data;
  try {
    const layout = await withQueueLock(async (tx) => {
      const current = await ensureQueueLayout(tx);
      if (getQueueRevision(current) !== input.revision)
        throw new QueuePlacementError(
          "Очередь изменилась. Обновите страницу и повторите перенос. / Queue changed; reload this page.",
          409,
        );
      if (input.action === "grouping") {
        if (current.separateCustomers === input.separateCustomers)
          return current;
        const automaticIds = current.stripes
          .filter((stripe) => !stripe.isManual)
          .flatMap((stripe) => stripe.stickers.map((sticker) => sticker.id));
        await tx.sticker.updateMany({
          where: { id: { in: automaticIds } },
          data: { printStripeId: null, printSlot: null },
        });
        await tx.systemSettings.update({
          where: { id: 1 },
          data: { separateCustomerStripes: input.separateCustomers },
        });
      } else if (input.action === "rename") {
        if (!current.stripes.some((stripe) => stripe.id === input.stripeId))
          throw new QueuePlacementError("Стрип не найден.", 409);
        await tx.printStripe.update({
          where: { id: input.stripeId },
          data: {
            label: input.label || null,
            ...(input.label ? { isManual: true } : {}),
          },
        });
      } else if (input.action === "automatic") {
        const plan = planStickerMove(
          current.stripes,
          input.stickerIds,
          null,
          0,
        );
        await tx.sticker.updateMany({
          where: { id: { in: input.stickerIds }, ...activeQueueWhere },
          data: { printStripeId: null, printSlot: null },
        });
        await tx.printStripe.updateMany({
          where: { id: { in: plan.manualStripeIds } },
          data: { isManual: true },
        });
      } else {
        const plan = planStickerMove(
          current.stripes,
          input.stickerIds,
          input.targetStripeId,
          input.targetSlot,
          input.swap,
        );
        let targetId = input.targetStripeId;
        if (!targetId) {
          const owners = current.stripes
            .flatMap((stripe) => stripe.stickers)
            .filter((sticker) => input.stickerIds.includes(sticker.id))
            .map((sticker) => sticker.userId);
          const created = await tx.printStripe.create({
            data: {
              isManual: true,
              label: input.label || null,
              customerId: new Set(owners).size === 1 ? owners[0] : null,
            },
          });
          targetId = created.id;
        }
        await tx.printStripe.updateMany({
          where: { id: { in: [...plan.manualStripeIds, targetId] } },
          data: { isManual: true },
        });
        await tx.sticker.updateMany({
          where: {
            id: { in: plan.moves.map((move) => move.id) },
            ...activeQueueWhere,
          },
          data: { printStripeId: null, printSlot: null },
        });
        for (const move of plan.moves)
          await tx.sticker.update({
            where: { id: move.id },
            data: {
              printStripeId: move.stripeId ?? targetId,
              printSlot: move.slot,
            },
          });
      }
      // Remove unused rows without touching any occupied slot or printed artwork.
      await tx.printStripe.deleteMany({ where: { stickers: { none: {} } } });
      return ensureQueueLayout(tx);
    });
    return jsonSuccess(queueManagerData(layout));
  } catch (error) {
    if (error instanceof QueuePlacementError)
      return jsonError(error.message, error.status);
    console.error("Queue placement failed", error);
    return jsonError(
      "Не удалось сохранить раскладку. Обновите страницу. / Could not save layout.",
      500,
    );
  }
}
