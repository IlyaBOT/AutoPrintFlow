import Link from "next/link";
import type { Sticker } from "@prisma/client";
import { Download, PencilLine } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

type StickerTileProps = {
  sticker: Pick<
    Sticker,
    | "id"
    | "status"
    | "previewFilePath"
    | "finalFilePath"
    | "createdAt"
    | "submittedAt"
    | "approvedAt"
    | "rejectReason"
  >;
};

export function StickerTile({ sticker }: StickerTileProps) {
  return (
    <Card className="overflow-hidden rounded-[28px]">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">Sticker {sticker.id.slice(0, 8)}</CardTitle>
          <CardDescription>Created {formatDate(sticker.createdAt)}</CardDescription>
        </div>
        <StatusBadge status={sticker.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <a href={`/api/stickers/${sticker.id}/asset?variant=final&download=1`} className="block">
          <div className="overflow-hidden rounded-[24px] border border-white/60 bg-white/80 p-3">
            <img
              src={`/api/stickers/${sticker.id}/asset?variant=preview`}
              alt={`Sticker ${sticker.id}`}
              className="aspect-square w-full rounded-[20px] object-cover"
            />
          </div>
        </a>
        <div className="space-y-2 text-sm text-slate-600">
          <div>Submitted: {formatDate(sticker.submittedAt)}</div>
          <div>Moderation: {sticker.approvedAt ? `Approved ${formatDate(sticker.approvedAt)}` : sticker.rejectReason ?? "Pending review"}</div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild className="flex-1" variant="secondary">
          <a href={`/api/stickers/${sticker.id}/asset?variant=final&download=1`}>
            <Download className="h-4 w-4" />
            Download PNG
          </a>
        </Button>
        {(sticker.status === "DRAFT" || sticker.status === "REJECTED") && (
          <Button asChild className="flex-1" variant="ghost">
            <Link href={`/editor/${sticker.id}`}>
              <PencilLine className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
