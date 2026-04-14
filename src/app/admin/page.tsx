import type { StickerStatus } from "@prisma/client";

import { AdminTabsNav } from "@/components/admin/admin-tabs-nav";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { SheetCard } from "@/components/admin/sheet-card";
import { StatusBadge } from "@/components/status-badge";
import { StatsCard } from "@/components/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guards";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getApprovedQueueLayout, getQueueStatsFromDb } from "@/lib/queue-data";
import { formatDate } from "@/lib/utils";

function ModerationList({
  title,
  description,
  stickers,
  showActions = false,
  locale,
  t,
}: {
  title: string;
  description: string;
  locale: "en" | "ru";
  t: (key: string, values?: Record<string, string | number | null | undefined>) => string;
  stickers: Array<{
    id: string;
    status: StickerStatus;
    createdAt: Date;
    submittedAt: Date | null;
    approvedAt: Date | null;
    printedAt: Date | null;
    rejectReason: string | null;
    user: {
      name: string;
      email: string;
    };
  }>;
  showActions?: boolean;
}) {
  if (stickers.length === 0) {
    return <EmptyState title={title} description={description} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="section-kicker">{title}</div>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {stickers.map((sticker) => (
          <Card key={sticker.id} className="rounded-[30px]">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{sticker.user.name}</CardTitle>
                <CardDescription>{sticker.user.email}</CardDescription>
              </div>
              <StatusBadge status={sticker.status} />
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[128px_minmax(0,1fr)]">
              <img
                src={`/api/stickers/${sticker.id}/asset?variant=preview`}
                alt={t("common.stickerPreviewAlt", { id: sticker.id })}
                className="aspect-square w-full rounded-[24px] border border-white/60 bg-white object-cover p-2"
              />
              <div className="space-y-3 text-sm text-slate-600">
                <div>{t("admin.metadataId")}: {sticker.id}</div>
                <div>{t("admin.metadataCreated")}: {formatDate(locale, sticker.createdAt, t("common.notAvailable"))}</div>
                <div>{t("admin.metadataSubmitted")}: {formatDate(locale, sticker.submittedAt, t("common.notAvailable"))}</div>
                <div>{t("admin.metadataApproved")}: {formatDate(locale, sticker.approvedAt, t("common.notAvailable"))}</div>
                <div>{t("admin.metadataPrinted")}: {formatDate(locale, sticker.printedAt, t("common.notAvailable"))}</div>
                {sticker.rejectReason ? <div>{t("admin.metadataRejectReason")}: {sticker.rejectReason}</div> : null}
                <div className="flex flex-wrap gap-3">
                  <a className="text-sm font-semibold text-sky-700" href={`/api/stickers/${sticker.id}/asset?variant=final&download=1`}>
                    {t("admin.downloadStickerPng")}
                  </a>
                </div>
                {showActions ? <ModerationActions stickerId={sticker.id} status={sticker.status} /> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);

  await requireAdminPage();

  const [stats, queueLayout, submitted, approved, rejected, printed] = await Promise.all([
    getQueueStatsFromDb(),
    getApprovedQueueLayout(),
    prisma.sticker.findMany({
      where: { status: "SUBMITTED" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.sticker.findMany({
      where: { status: "APPROVED", printedAt: null },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { approvedAt: "asc" },
    }),
    prisma.sticker.findMany({
      where: { status: "REJECTED" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.sticker.findMany({
      where: { status: "PRINTED" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { printedAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <main className="page-shell space-y-8">
      <section className="space-y-4">
        <div>
          <div className="section-kicker">{t("admin.portalKicker")}</div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{t("admin.printQueueHeading")}</h1>
          <p className="mt-2 text-slate-600">{t("admin.printQueueDescription")}</p>
        </div>
        <AdminTabsNav
          active="/admin"
          tabs={[
            { href: "/admin/account", label: t("admin.accountTab") },
            { href: "/admin", label: t("admin.printQueueTab") },
            { href: "/admin/system-settings", label: t("admin.systemSettingsTab") },
          ]}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard label={t("admin.statsSubmittedLabel")} value={stats.submittedCount} helper={t("admin.statsSubmittedHelper")} />
        <StatsCard label={t("admin.statsApprovedLabel")} value={stats.approvedWaitingCount} helper={t("admin.statsApprovedHelper")} />
        <StatsCard label={t("admin.statsStripesLabel")} value={stats.totalStripes} helper={t("admin.statsStripesHelper")} />
        <StatsCard label={t("admin.statsSheetsLabel")} value={stats.totalSheets} helper={t("admin.statsSheetsHelper")} />
        <StatsCard label={t("admin.statsPrintedLabel")} value={stats.printedCount} helper={t("admin.statsPrintedHelper")} />
      </section>

      <section className="space-y-4">
        <div>
          <div className="section-kicker">{t("admin.printableQueueKicker")}</div>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">{t("admin.printableQueueTitle")}</h2>
        </div>
        {queueLayout.sheets.length === 0 ? (
          <EmptyState
            title={t("admin.printableQueueEmptyTitle")}
            description={t("admin.printableQueueEmptyDescription")}
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {queueLayout.sheets.map((sheet) => (
              <SheetCard key={sheet.index} sheet={sheet} />
            ))}
          </div>
        )}
      </section>

      <section>
        <Tabs defaultValue="submitted">
          <TabsList>
            <TabsTrigger value="submitted">{t("admin.tabSubmitted")}</TabsTrigger>
            <TabsTrigger value="approved">{t("admin.tabApproved")}</TabsTrigger>
            <TabsTrigger value="rejected">{t("admin.tabRejected")}</TabsTrigger>
            <TabsTrigger value="printed">{t("admin.tabPrinted")}</TabsTrigger>
          </TabsList>
          <TabsContent value="submitted">
            <ModerationList
              title={t("admin.pendingModerationTitle")}
              description={t("admin.pendingModerationDescription")}
              locale={locale}
              t={t}
              stickers={submitted}
              showActions
            />
          </TabsContent>
          <TabsContent value="approved">
            <ModerationList
              title={t("admin.approvedQueueTitle")}
              description={t("admin.approvedQueueDescription")}
              locale={locale}
              t={t}
              stickers={approved}
              showActions
            />
          </TabsContent>
          <TabsContent value="rejected">
            <ModerationList
              title={t("admin.rejectedTitle")}
              description={t("admin.rejectedDescription")}
              locale={locale}
              t={t}
              stickers={rejected}
            />
          </TabsContent>
          <TabsContent value="printed">
            <ModerationList
              title={t("admin.printedTitle")}
              description={t("admin.printedDescription")}
              locale={locale}
              t={t}
              stickers={printed}
            />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
