import { StickerStatus } from "@prisma/client";

import { StickerTile } from "@/components/dashboard/sticker-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { StatsCard } from "@/components/stats-card";
import { requireUserPage } from "@/lib/auth/guards";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getQueueStatsFromDb } from "@/lib/queue-data";

export default async function DashboardPage() {
  const [user, locale] = await Promise.all([requireUserPage(), getLocale()]);
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);

  const [queueStats, stickers, statusCounts] = await Promise.all([
    getQueueStatsFromDb(),
    prisma.sticker.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.sticker.groupBy({
      by: ["status"],
      where: {
        userId: user.id,
      },
      _count: {
        status: true,
      },
    }),
  ]);

  const countFor = (status: StickerStatus) =>
    statusCounts.find((item) => item.status === status)?._count.status ?? 0;
  const recentDrafts = stickers.filter((sticker) => sticker.status === "DRAFT" || sticker.status === "REJECTED").slice(0, 4);
  const recentSubmitted = stickers.filter((sticker) => sticker.status === "SUBMITTED").slice(0, 4);

  return (
    <main className="page-shell space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard label={t("dashboard.statsDraftsLabel")} value={countFor("DRAFT")} helper={t("dashboard.statsDraftsHelper")} />
        <StatsCard label={t("dashboard.statsSubmittedLabel")} value={countFor("SUBMITTED")} helper={t("dashboard.statsSubmittedHelper")} />
        <StatsCard label={t("dashboard.statsApprovedQueueLabel")} value={queueStats.totalApprovedStickers} helper={t("dashboard.statsApprovedQueueHelper")} />
        <StatsCard label={t("dashboard.statsQueueStripesLabel")} value={queueStats.totalStripes} helper={t("dashboard.statsQueueStripesHelper")} />
        <StatsCard label={t("dashboard.statsPrintedLabel")} value={queueStats.printedCount} helper={t("dashboard.statsPrintedHelper")} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="section-kicker">{t("dashboard.recentDraftsKicker")}</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("dashboard.recentDraftsTitle")}</h2>
          </div>
          {recentDrafts.length === 0 ? (
            <EmptyState
              title={t("dashboard.emptyDraftsTitle")}
              description={t("dashboard.emptyDraftsDescription")}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recentDrafts.map((sticker) => (
                <StickerTile key={sticker.id} sticker={sticker} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="section-kicker">{t("dashboard.submittedItemsKicker")}</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("dashboard.submittedItemsTitle")}</h2>
          </div>
          {recentSubmitted.length === 0 ? (
            <EmptyState
              title={t("dashboard.emptySubmittedTitle")}
              description={t("dashboard.emptySubmittedDescription")}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {recentSubmitted.map((sticker) => (
                <StickerTile key={sticker.id} sticker={sticker} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="section-kicker">{t("dashboard.allStickersKicker")}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("dashboard.allStickersTitle")}</h2>
        </div>
        {stickers.length === 0 ? (
          <EmptyState
            title={t("dashboard.emptyArchiveTitle")}
            description={t("dashboard.emptyArchiveDescription")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stickers.map((sticker) => (
              <StickerTile key={sticker.id} sticker={sticker} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
