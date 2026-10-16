import { notFound } from "next/navigation";

import { StickerEditor } from "@/components/editor/sticker-editor";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getApprovedQueueLayout } from "@/lib/queue-data";
import { buildQueueLayout } from "@/lib/queue";
import { getStickerEditorState } from "@/lib/stickers";

export default async function StickerEditorPage({
  params,
}: {
  params: Promise<{ stickerId: string }>;
}) {
  const user = await requireUserPage();
  const { stickerId } = await params;
  const sticker = await prisma.sticker.findFirst({
    where: {
      id: stickerId,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
  });

  if (!sticker) {
    notFound();
  }

  const queue = await getApprovedQueueLayout();
  const approvedQueue = queue.stripes.flatMap((stripe) => stripe.stickers);
  const currentInApprovedQueue = approvedQueue.some(
    (item) => item.id === sticker.id,
  );
  const previewQueue = currentInApprovedQueue
    ? approvedQueue
    : [
        ...approvedQueue,
        {
          id: sticker.id,
          userId: sticker.userId,
          createdAt: sticker.createdAt,
          approvedAt: new Date(),
          submittedAt: sticker.submittedAt,
          printedAt: sticker.printedAt,
          finalFilePath: sticker.finalFilePath,
          previewFilePath: sticker.previewFilePath,
          status: "APPROVED" as const,
        },
      ];

  const { stripes } = buildQueueLayout(previewQueue, {
    separateCustomers: queue.separateCustomers,
    stripes: queue.stripes.map((stripe) => ({
      id: stripe.id!,
      position: stripe.position!,
      customerId: stripe.customerId ?? null,
      label: stripe.label ?? null,
      isManual: stripe.isManual ?? false,
    })),
  });
  const previewStripe = stripes.find((stripe) =>
    stripe.slots.some((slot) => slot?.id === sticker.id),
  ) ??
    stripes.at(0) ?? {
      index: 1,
      sheetIndex: 1,
      positionInSheet: 0,
      stickers: [],
      slots: Array.from({ length: 8 }, () => null),
      stickerCount: 0,
    };
  const stripePreviewSlots = previewStripe.slots.map((slot) =>
    slot
      ? slot.id === sticker.id
        ? { kind: "current" as const, id: slot.id }
        : slot.userId !== user.id
          ? { kind: "locked" as const }
          : {
              kind: "existing" as const,
              id: slot.id,
              imageUrl: slot.previewFilePath
                ? `/api/stickers/${slot.id}/asset?variant=preview`
                : null,
            }
      : null,
  );

  return (
    <main className="page-shell">
      <StickerEditor
        legacyPreviewUrl={
          !getStickerEditorState(sticker).cutShape &&
          !["DRAFT", "REJECTED"].includes(sticker.status)
            ? `/api/stickers/${sticker.id}/asset?variant=final`
            : undefined
        }
        initialVersion={sticker.updatedAt.toISOString()}
        readOnly={sticker.userId !== user.id}
        stickerId={sticker.id}
        status={sticker.status}
        rejectReason={sticker.rejectReason}
        originalWidth={sticker.originalWidth}
        originalHeight={sticker.originalHeight}
        originalAssetUrl={`/api/stickers/${sticker.id}/asset?variant=original`}
        initialState={getStickerEditorState(sticker)}
        stripePreviewSlots={stripePreviewSlots}
      />
    </main>
  );
}
