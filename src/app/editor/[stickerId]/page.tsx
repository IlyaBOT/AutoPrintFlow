import { notFound } from "next/navigation";

import { StickerEditor } from "@/components/editor/sticker-editor";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
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
      userId: user.id,
    },
  });

  if (!sticker) {
    notFound();
  }

  const approvedQueue = await prisma.sticker.findMany({
    where: {
      status: "APPROVED",
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

  const currentInApprovedQueue = approvedQueue.some((item) => item.id === sticker.id);
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

  const { stripes } = buildQueueLayout(previewQueue);
  const previewStripe =
    stripes.find((stripe) => stripe.slots.some((slot) => slot?.id === sticker.id)) ??
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
        : {
            kind: "existing" as const,
            id: slot.id,
            imageUrl: slot.previewFilePath ? `/api/stickers/${slot.id}/asset?variant=preview` : null,
          }
      : null,
  );

  return (
    <main className="page-shell">
      <StickerEditor
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
