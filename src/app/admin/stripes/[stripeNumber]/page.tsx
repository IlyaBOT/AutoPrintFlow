import { notFound } from "next/navigation";

import { ModerationActions } from "@/components/admin/moderation-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guards";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getApprovedQueueLayout } from "@/lib/queue-data";
import { formatDate } from "@/lib/utils";

export default async function AdminStripeDetailsPage({
  params,
}: {
  params: Promise<{ stripeNumber: string }>;
}) {
  await requireAdminPage();
  const locale = await getLocale();
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);
  const { stripeNumber } = await params;
  const stripeIndex = Number(stripeNumber);
  const { stripes } = await getApprovedQueueLayout();
  const stripe = stripes[stripeIndex - 1];

  if (!stripe) {
    notFound();
  }

  const stickerIds = stripe.stickers.map((sticker) => sticker.id);
  const stickers = await prisma.sticker.findMany({
    where: {
      id: {
        in: stickerIds,
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  const ordered = stickerIds.map((id) => stickers.find((sticker) => sticker.id === id)).filter(Boolean);

  return (
    <main className="page-shell space-y-8">
      <section className="glass-panel rounded-[36px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-kicker">{t("admin.stripeDetailsKicker")}</div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{t("admin.stripeTitle", { index: stripe.index })}</h1>
            <p className="mt-2 text-slate-600">{t("admin.stripeSummary", { sheetIndex: stripe.sheetIndex, stickerCount: stripe.stickerCount })}</p>
          </div>
          <Button asChild variant="secondary">
            <a href={`/api/admin/queue/stripe/${stripe.index}?download=1`}>{t("admin.stripeDetailsDownload")}</a>
          </Button>
        </div>
        <div className="mt-6 overflow-hidden rounded-[30px] border border-white/60 bg-white/80 p-4">
          <img
            src={`/api/admin/queue/stripe/${stripe.index}`}
            alt={t("admin.stripeAlt", { index: stripe.index })}
            className="aspect-[1120/2409] w-full rounded-[24px] object-cover"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="section-kicker">{t("admin.containedStickersKicker")}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("admin.containedStickersTitle")}</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {ordered.map((sticker) =>
            sticker ? (
              <Card key={sticker.id} className="rounded-[30px]">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{sticker.user.name}</CardTitle>
                    <CardDescription>{sticker.user.email}</CardDescription>
                  </div>
                  <StatusBadge status={sticker.status} />
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-[144px_minmax(0,1fr)]">
                  <img
                    src={`/api/stickers/${sticker.id}/asset?variant=preview`}
                    alt={t("common.stickerPreviewAlt", { id: sticker.id })}
                    className="aspect-square rounded-[24px] border border-white/60 bg-white object-cover p-2"
                  />
                  <div className="space-y-3 text-sm text-slate-600">
                    <div>{t("admin.stickerId")}: {sticker.id}</div>
                    <div>{t("admin.metadataCreated")}: {formatDate(locale, sticker.createdAt, t("common.notAvailable"))}</div>
                    <div>{t("admin.metadataSubmitted")}: {formatDate(locale, sticker.submittedAt, t("common.notAvailable"))}</div>
                    <div>{t("admin.metadataApproved")}: {formatDate(locale, sticker.approvedAt, t("common.notAvailable"))}</div>
                    <div>{t("admin.originalSize")}: {sticker.originalWidth} x {sticker.originalHeight}px</div>
                    {sticker.rejectReason ? <div>{t("admin.metadataRejectReason")}: {sticker.rejectReason}</div> : null}
                    <div className="flex flex-wrap gap-4">
                      <a className="font-semibold text-sky-700" href={`/api/stickers/${sticker.id}/asset?variant=final&download=1`}>
                        {t("admin.download42Png")}
                      </a>
                    </div>
                    <ModerationActions stickerId={sticker.id} status={sticker.status} />
                  </div>
                </CardContent>
              </Card>
            ) : null,
          )}
        </div>
      </section>
    </main>
  );
}
