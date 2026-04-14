"use client";

import Link from "next/link";
import type { Sticker } from "@prisma/client";

import { useI18n } from "@/components/providers/i18n-provider";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { NerdIcon } from "@/components/ui/nerd-icon";
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
  const { locale, t } = useI18n();
  const moderationValue = sticker.approvedAt
    ? t("stickerTile.approvedOn", {
        date: formatDate(locale, sticker.approvedAt, t("common.notAvailable")),
      })
    : sticker.rejectReason ?? t("stickerTile.pendingReview");

  return (
    <Card className="overflow-hidden rounded-[28px]">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-lg">{t("stickerTile.title", { id: sticker.id.slice(0, 8) })}</CardTitle>
          <CardDescription>
            {t("stickerTile.created", {
              date: formatDate(locale, sticker.createdAt, t("common.notAvailable")),
            })}
          </CardDescription>
        </div>
        <StatusBadge status={sticker.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        <a href={`/api/stickers/${sticker.id}/asset?variant=final&download=1`} className="block">
          <div className="overflow-hidden rounded-[24px] border border-white/60 bg-white/80 p-3">
            <img
              src={`/api/stickers/${sticker.id}/asset?variant=preview`}
              alt={t("common.stickerPreviewAlt", { id: sticker.id })}
              className="aspect-square w-full rounded-[20px] object-cover"
            />
          </div>
        </a>
        <div className="space-y-2 text-sm text-slate-600">
          <div>
            {t("stickerTile.submitted", {
              date: formatDate(locale, sticker.submittedAt, t("common.notAvailable")),
            })}
          </div>
          <div>{t("stickerTile.moderation", { value: moderationValue })}</div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild className="flex-1" variant="secondary">
          <a href={`/api/stickers/${sticker.id}/asset?variant=final&download=1`}>
            <NerdIcon className="text-sm" name="download" />
            {t("stickerTile.downloadPng")}
          </a>
        </Button>
        {(sticker.status === "DRAFT" || sticker.status === "REJECTED") && (
          <Button asChild className="flex-1" variant="ghost">
            <Link href={`/editor/${sticker.id}`}>
              <NerdIcon className="text-sm" name="edit" />
              {t("stickerTile.edit")}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
