import { notFound } from "next/navigation";

import { StickerEditor } from "@/components/editor/sticker-editor";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
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
      />
    </main>
  );
}
