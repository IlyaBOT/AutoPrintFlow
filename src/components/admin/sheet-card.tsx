"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers/i18n-provider";
import type { QueueSheet } from "@/types/stickers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { NerdIcon } from "@/components/ui/nerd-icon";
import { pluralize } from "@/lib/utils";

export function SheetCard({ sheet }: { sheet: QueueSheet }) {
  const { locale, t } = useI18n();

  return (
    <Card className="overflow-hidden rounded-[32px]">
      <CardHeader>
        <CardTitle className="text-xl">{t("admin.sheetTitle", { index: sheet.index })}</CardTitle>
        <CardDescription>
          {t("admin.sheetSummary", {
            stripeCount: sheet.stripeCount,
            stripeWord: pluralize(locale, sheet.stripeCount, {
              one: t("common.stripeOne"),
              few: t("common.stripeFew"),
              many: t("common.stripeMany"),
            }),
            stickerCount: sheet.stickerCount,
            stickerWord: pluralize(locale, sheet.stickerCount, {
              one: t("common.stickerOne"),
              few: t("common.stickerFew"),
              many: t("common.stickerMany"),
            }),
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mx-auto w-full overflow-hidden rounded-[24px] border border-white/60 bg-white/80 p-3 md:max-w-[70%]">
          <img
            src={`/api/admin/queue/sheet/${sheet.index}`}
            alt={t("admin.sheetAlt", { index: sheet.index })}
            className="aspect-[1.414/1] w-full rounded-[20px] object-cover"
          />
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild className="flex-1" variant="secondary">
          <a href={`/api/admin/queue/sheet/${sheet.index}?download=1`}>
            <NerdIcon className="text-sm" name="download" />
            {t("admin.downloadA4")}
          </a>
        </Button>
        <Button asChild className="flex-1" variant="ghost">
          <Link href={`/admin/sheets/${sheet.index}`}>
            <NerdIcon className="text-sm" name="layers" />
            {t("admin.details")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
