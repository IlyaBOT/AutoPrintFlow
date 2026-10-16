import "server-only";
import crypto from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { STRIPES_PER_SHEET } from "@/lib/image/constants";
import { prisma } from "@/lib/prisma";
import { sheetLayoutToken, sheetStickerIds } from "@/lib/queue-snapshot";
import { buildQueueLayout, buildQueueStats } from "@/lib/queue";
import type { QueueStripe } from "@/types/stickers";

export const activeQueueWhere = {
  status: "APPROVED" as const,
  printedAt: null,
};
type QueueDb = Prisma.TransactionClient | PrismaClient;
export async function withQueueLock<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT 1::int AS locked FROM pg_advisory_xact_lock(1670042183)`;
      return operation(tx);
    },
    { maxWait: 10000, timeout: 30000 },
  );
}
async function readQueue(db: QueueDb) {
  const settings = await db.systemSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: { separateCustomerStripes: true },
  });
  const stickers = await db.sticker.findMany({
    where: activeQueueWhere,
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ approvedAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  const definitions = await db.printStripe.findMany({
    where: { stickers: { some: activeQueueWhere } },
    select: {
      id: true,
      position: true,
      label: true,
      isManual: true,
      customerId: true,
    },
    orderBy: { position: "asc" },
  });
  return {
    layout: buildQueueLayout(
      stickers.map(({ user, ...sticker }) => ({
        ...sticker,
        userName: user.name,
        userEmail: user.email,
      })),
      {
        separateCustomers: settings.separateCustomerStripes,
        stripes: definitions,
      },
    ),
    unassigned: stickers.some((sticker) => sticker.printStripeId === null),
  };
}
// Called inside the shared queue lock. Existing placements are never compacted.
export async function ensureQueueLayout(tx: Prisma.TransactionClient) {
  const { layout } = await readQueue(tx);
  for (const stripe of layout.stripes) {
    if (stripe.id!.startsWith("pending:")) {
      const created = await tx.printStripe.create({
        data: { customerId: stripe.customerId, isManual: false },
        select: { id: true, position: true },
      });
      stripe.id = created.id;
      stripe.position = created.position;
    }
    for (const [slot, sticker] of stripe.slots.entries()) {
      if (
        !sticker ||
        (sticker.printStripeId === stripe.id && sticker.printSlot === slot)
      )
        continue;
      await tx.sticker.update({
        where: { id: sticker.id },
        data: { printStripeId: stripe.id, printSlot: slot },
      });
    }
  }
  return (await readQueue(tx)).layout;
}
export async function getApprovedQueueLayout() {
  const current = await prisma.$transaction((tx) => readQueue(tx), {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
  });
  if (!current.unassigned) return current.layout;
  return withQueueLock((tx) => ensureQueueLayout(tx));
}
export function getQueueRevision(layout: {
  stripes: QueueStripe[];
  separateCustomers: boolean;
}) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify([
        layout.separateCustomers,
        layout.stripes.map((stripe) => [
          stripe.id,
          stripe.label,
          stripe.isManual,
          stripe.customerId,
          stripe.slots.map((slot) =>
            slot ? [slot.id, slot.updatedAt?.toISOString()] : null,
          ),
        ]),
      ]),
    )
    .digest("hex");
}
export async function getQueueStatsFromDb() {
  const [totals, submittedCount, printedCount] = await prisma.$transaction(
    [
      prisma.$queryRaw<
        Array<{ stickers: number; stripes: number; unassigned: number }>
      >`
      SELECT COUNT(*)::int AS stickers,
        COUNT(DISTINCT "printStripeId")::int AS stripes,
        (COUNT(*) FILTER (WHERE "printStripeId" IS NULL))::int AS unassigned
      FROM "Sticker" WHERE status = 'APPROVED' AND "printedAt" IS NULL
    `,
      prisma.sticker.count({ where: { status: "SUBMITTED" } }),
      prisma.sticker.count({ where: { status: "PRINTED" } }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
  if (totals[0].unassigned) {
    const layout = await getApprovedQueueLayout();
    return buildQueueStats({
      approvedCount: layout.stripes.reduce(
        (sum, stripe) => sum + stripe.stickerCount,
        0,
      ),
      submittedCount,
      printedCount,
      layout,
    });
  }
  return {
    totalApprovedStickers: totals[0].stickers,
    approvedWaitingCount: totals[0].stickers,
    totalStripes: totals[0].stripes,
    totalSheets: Math.ceil(totals[0].stripes / STRIPES_PER_SHEET),
    submittedCount,
    printedCount,
  };
}

export function queueManagerData(
  layout: Awaited<ReturnType<typeof getApprovedQueueLayout>>,
): import("@/types/stickers").QueueManagerData {
  return {
    sheetSnapshots: layout.sheets.map((sheet) => ({
      index: sheet.index,
      layout: sheetLayoutToken(sheet),
      stickerIds: sheetStickerIds(sheet),
    })),
    revision: getQueueRevision(layout),
    separateCustomers: layout.separateCustomers,
    totalSheets: layout.sheets.length,
    stripes: layout.stripes.map((stripe) => ({
      id: stripe.id!,
      index: stripe.index,
      sheetIndex: stripe.sheetIndex,
      positionInSheet: stripe.positionInSheet,
      label: stripe.label ?? null,
      isManual: stripe.isManual ?? false,
      slots: stripe.slots.map((sticker) =>
        sticker
          ? {
              id: sticker.id,
              userId: sticker.userId,
              userName: sticker.userName ?? sticker.userId,
              userEmail: sticker.userEmail ?? "",
            }
          : null,
      ),
    })),
  };
}
