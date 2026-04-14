import Link from "next/link";

import { UploadPanel } from "@/components/editor/upload-panel";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatsCard } from "@/components/stats-card";
import { requireUserPage } from "@/lib/auth/guards";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";

export default async function NewEditorPage() {
  const [user, locale] = await Promise.all([requireUserPage(), getLocale()]);
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);

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
        <StatsCard label={t("editorNew.statsDraftsLabel")} value={draftCount} helper={t("editorNew.statsDraftsHelper")} />
        <StatsCard label={t("editorNew.statsSubmittedLabel")} value={submittedCount} helper={t("editorNew.statsSubmittedHelper")} />
        <StatsCard label={t("editorNew.statsExportSizeLabel")} value="496 px" helper={t("editorNew.statsExportSizeHelper")} />
      </section>

      <UploadPanel />

      <section className="space-y-4">
        <div>
          <div className="section-kicker">{t("editorNew.recentWorkKicker")}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("editorNew.recentWorkTitle")}</h2>
        </div>

        {recentDrafts.length === 0 ? (
          <EmptyState
            title={t("editorNew.emptyRecentTitle")}
            description={t("editorNew.emptyRecentDescription")}
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
                  alt={t("common.stickerPreviewAlt", { id: sticker.id })}
                  className="aspect-square w-full rounded-[20px] object-cover"
                />
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-900">{sticker.id.slice(0, 8)}</span>
                  <StatusBadge status={sticker.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
