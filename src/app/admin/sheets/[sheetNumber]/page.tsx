import { notFound } from "next/navigation";

import { StripeCard } from "@/components/admin/stripe-card";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { getApprovedQueueLayout } from "@/lib/queue-data";
import { pluralize } from "@/lib/utils";

export default async function AdminSheetDetailsPage({
  params,
}: {
  params: Promise<{ sheetNumber: string }>;
}) {
  await requireAdminPage();
  const locale = await getLocale();
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);
  const { sheetNumber } = await params;
  const sheetIndex = Number(sheetNumber);
  const { sheets } = await getApprovedQueueLayout();
  const sheet = sheets[sheetIndex - 1];

  if (!sheet) {
    notFound();
  }

  return (
    <main className="page-shell space-y-8">
      <section className="glass-panel rounded-[36px] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-kicker">{t("admin.sheetDetailsKicker")}</div>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">{t("admin.sheetTitle", { index: sheet.index })}</h1>
            <p className="mt-2 text-slate-600">
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
            </p>
          </div>
          <Button asChild variant="secondary">
            <a href={`/api/admin/queue/sheet/${sheet.index}?download=1`}>{t("admin.sheetDetailsDownload")}</a>
          </Button>
        </div>
        <div className="mt-6 overflow-hidden rounded-[30px] border border-white/60 bg-white/80 p-4">
          <img
            src={`/api/admin/queue/sheet/${sheet.index}`}
            alt={t("admin.sheetAlt", { index: sheet.index })}
            className="aspect-[3508/2480] w-full rounded-[24px] object-cover"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="section-kicker">{t("admin.containedStripesKicker")}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("admin.containedStripesTitle")}</h2>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {sheet.stripes.map((stripe) => (
            <StripeCard key={stripe.index} stripe={stripe} />
          ))}
        </div>
      </section>
    </main>
  );
}
