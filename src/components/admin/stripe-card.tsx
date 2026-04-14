"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers/i18n-provider";
import type { QueueStripe } from "@/types/stickers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { NerdIcon } from "@/components/ui/nerd-icon";

export function StripeCard({ stripe }: { stripe: QueueStripe }) {
  const { t } = useI18n();

  return (
    <Card className="rounded-[32px]">
      <CardHeader>
        <CardTitle className="text-lg">{t("admin.stripeTitle", { index: stripe.index })}</CardTitle>
        <CardDescription>{t("admin.slotsFilled", { count: stripe.stickerCount })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-[24px] border border-white/60 bg-white/80 p-3">
          <img
            src={`/api/admin/queue/stripe/${stripe.index}`}
            alt={t("admin.stripeAlt", { index: stripe.index })}
            className="aspect-[1120/2409] w-full rounded-[20px] object-cover"
          />
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild className="flex-1" variant="secondary">
          <a href={`/api/admin/queue/stripe/${stripe.index}?download=1`}>
            <NerdIcon className="text-sm" name="download" />
            {t("admin.downloadStripe")}
          </a>
        </Button>
        <Button asChild className="flex-1" variant="ghost">
          <Link href={`/admin/stripes/${stripe.index}`}>
            <NerdIcon className="text-sm" name="rows" />
            {t("admin.details")}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
