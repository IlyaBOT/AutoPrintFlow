import Link from "next/link";

import { UploadPanel } from "@/components/editor/upload-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { StatsCard } from "@/components/stats-card";
import { requireUserPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function NewEditorPage() {
  const user = await requireUserPage();

  const [draftCount, submittedCount, recentDrafts] = await Promise.all([
    prisma.sticker.count({
      where: {
        userId: user.id,
        status: "DRAFT",
      },
    }),
    prisma.sticker.count({
      where: {
        userId: user.id,
        status: "SUBMITTED",
      },
    }),
    prisma.sticker.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 4,
      select: {
        id: true,
        status: true,
        previewFilePath: true,
      },
    }),
  ]);

  return (
    <main className="page-shell space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <StatsCard label="Your Drafts" value={draftCount} helper="Editable and private to your account" />
        <StatsCard label="Submitted" value={submittedCount} helper="Waiting for moderation" />
        <StatsCard label="Export Size" value="496 px" helper="42x42 mm at 300 DPI" />
      </section>

      <UploadPanel />

      <section className="space-y-4">
        <div>
          <div className="section-kicker">Recent work</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Continue an existing sticker</h2>
        </div>

        {recentDrafts.length === 0 ? (
          <EmptyState
            title="No sticker drafts yet"
            description="Upload your first image above to create a draft and open the square sticker editor."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recentDrafts.map((sticker) => (
              <Link
                key={sticker.id}
                href={`/editor/${sticker.id}`}
                className="soft-card overflow-hidden rounded-[28px] border border-white/60 p-4 transition hover:-translate-y-1"
              >
                <img
                  src={`/api/stickers/${sticker.id}/asset?variant=preview`}
                  alt={`Sticker ${sticker.id}`}
                  className="aspect-square w-full rounded-[20px] object-cover"
                />
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">{sticker.id.slice(0, 8)}</span>
                  <span className="text-slate-500">{sticker.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
