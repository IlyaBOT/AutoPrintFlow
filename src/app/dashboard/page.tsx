import { StickerStatus } from "@prisma/client";

import { StickerTile } from "@/components/dashboard/sticker-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { StatsCard } from "@/components/stats-card";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getQueueStatsFromDb } from "@/lib/queue-data";

export default async function DashboardPage() {
  const user = await requireUserPage();

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
        <StatsCard label="Your Drafts" value={countFor("DRAFT")} helper="Still editable" />
        <StatsCard label="Submitted" value={countFor("SUBMITTED")} helper="Waiting moderation" />
        <StatsCard label="Approved Queue" value={queueStats.totalApprovedStickers} helper="Global approved stickers" />
        <StatsCard label="Queue Stripes" value={queueStats.totalStripes} helper="Global printable stripes" />
        <StatsCard label="Printed Archive" value={queueStats.printedCount} helper="Global printed items" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <div>
            <div className="section-kicker">Recent drafts</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Continue editing</h2>
          </div>
          {recentDrafts.length === 0 ? (
            <EmptyState
              title="No editable drafts"
              description="Create a new layout to upload artwork and start building a print-ready sticker."
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
            <div className="section-kicker">Submitted items</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Moderation status</h2>
          </div>
          {recentSubmitted.length === 0 ? (
            <EmptyState
              title="Nothing is pending moderation"
              description="Once you submit a sticker, it will appear here with its moderation result and protected PNG download."
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
          <div className="section-kicker">All stickers</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Your full private archive</h2>
        </div>
        {stickers.length === 0 ? (
          <EmptyState
            title="No stickers yet"
            description="Create your first layout to see sticker history, statuses, and protected downloads here."
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
