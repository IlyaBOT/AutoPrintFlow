import Link from "next/link";
import { StickerStatus, type Prisma } from "@prisma/client";
import {
  ArrowUpRight,
  Scissors,
  Search,
  Printer,
  CheckCircle2,
} from "lucide-react";
import { AdminTabsNav } from "@/components/admin/admin-tabs-nav";
import { ModerationActions } from "@/components/admin/moderation-actions";
import { QueuePlacementManager } from "@/components/admin/queue-placement-manager";
import { SheetCard } from "@/components/admin/sheet-card";
import { StatusBadge } from "@/components/status-badge";
import { StatsCard } from "@/components/stats-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import {
  getApprovedQueueLayout,
  getQueueStatsFromDb,
  queueManagerData,
} from "@/lib/queue-data";
import { formatDate } from "@/lib/utils";

const pageSize = 12;
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    status?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireAdminPage();
  const { locale, t } = await getTranslator();
  const ru = locale === "ru",
    text = (a: string, b: string) => (ru ? a : b);
  const search = await searchParams;
  const production = search.view === "production";
  const status = ["SUBMITTED", "APPROVED", "REJECTED", "PRINTED"].includes(
    search.status ?? "",
  )
    ? (search.status as StickerStatus)
    : StickerStatus.SUBMITTED;
  const q = (search.q ?? "").trim().slice(0, 100);
  const page = Math.min(
    10000,
    Math.max(1, Number.parseInt(search.page ?? "1") || 1),
  );
  const where: Prisma.StickerWhereInput = {
    status,
    ...(q
      ? {
          OR: [
            { id: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const [stats, queue, stickers, total] = await Promise.all([
    getQueueStatsFromDb(),
    production ? getApprovedQueueLayout() : Promise.resolve(null),
    production
      ? Promise.resolve([])
      : prisma.sticker.findMany({
          where,
          include: { user: { select: { name: true, email: true } } },
          orderBy: [
            { submittedAt: status === "SUBMITTED" ? "asc" : "desc" },
            { createdAt: "desc" },
            { id: "asc" },
          ],
          take: pageSize,
          skip: (page - 1) * pageSize,
        }),
    production ? Promise.resolve(0) : prisma.sticker.count({ where }),
  ]);
  const href = (nextPage: number) =>
    `/admin?status=${status}&q=${encodeURIComponent(q)}&page=${nextPage}`;
  return (
    <main className="page-shell space-y-6">
      <section className="glass-panel rounded-[28px] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker">
              {text("Управление мастерской", "Workshop control")}
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {text("Печать под контролем", "Your print workspace")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {text(
                "Проверьте макеты, соберите лист и подготовьте каждый стикер к резке.",
                "Review artwork, build a print sheet and prepare each sticker for cutting.",
              )}
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/editor/new">
              {t("header.createLayout")}
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="mt-5">
          <AdminTabsNav
            active="/admin"
            tabs={[
              { href: "/admin", label: t("admin.printQueueTab") },
              {
                href: "/admin/system-settings",
                label: t("admin.systemSettingsTab"),
              },
              { href: "/admin/account", label: t("admin.accountTab") },
            ]}
          />
        </div>
      </section>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatsCard
          label={t("admin.statsSubmittedLabel")}
          value={stats.submittedCount}
          helper={text("Нужна проверка макета", "Awaiting artwork review")}
        />
        <StatsCard
          label={t("admin.statsApprovedLabel")}
          value={stats.approvedWaitingCount}
          helper={text("Готовы к производству", "Ready for production")}
        />
        <StatsCard
          label={t("admin.statsSheetsLabel")}
          value={stats.totalSheets}
          helper={text(
            `${stats.totalStripes} полос в очереди`,
            `${stats.totalStripes} stripes queued`,
          )}
        />
        <StatsCard
          label={t("admin.statsPrintedLabel")}
          value={stats.printedCount}
          helper={text("Завершённые стикеры", "Completed stickers")}
        />
      </section>
      <nav
        className="flex flex-wrap gap-2"
        aria-label={text("Разделы производства", "Production sections")}
      >
        <Button asChild variant={!production ? "default" : "secondary"}>
          <Link href="/admin">
            <CheckCircle2 size={17} />
            {text("Модерация и заказы", "Review and orders")}
            {stats.submittedCount ? ` · ${stats.submittedCount}` : ""}
          </Link>
        </Button>
        <Button asChild variant={production ? "default" : "secondary"}>
          <Link href="/admin?view=production">
            <Printer size={17} />
            {text("Печать и резка", "Print and cut")}
            {stats.totalSheets ? ` · ${stats.totalSheets}` : ""}
          </Link>
        </Button>
      </nav>
      {production ? (
        <section className="space-y-5">
          {queue && <QueuePlacementManager data={queueManagerData(queue)} />}
          <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
            <Scissors size={20} className="mt-1 shrink-0" />
            <p>
              {text(
                "PSD — отдельный слой для каждого стикера. «Печать + резка» — PSD, PNG и отдельные SVG для поля 80 × 80 мм. Под каждый следующий стикер лист нужно переставлять и выравнивать по шаблону станка.",
                "PSD contains one layer per sticker. Print + cut includes PSD, PNG and separate SVGs for an 80 × 80 mm bed. Reposition and align the sheet for each sticker using your machine jig.",
              )}
            </p>
          </div>
          {!queue?.sheets.length ? (
            <EmptyState
              title={t("admin.printableQueueEmptyTitle")}
              description={t("admin.printableQueueEmptyDescription")}
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {queue.sheets.slice((page - 1) * 4, page * 4).map((sheet) => (
                <SheetCard key={sheet.index} sheet={sheet} />
              ))}
            </div>
          )}
          {queue && queue.sheets.length > 4 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="mr-auto text-sm text-muted-foreground">
                {text(`Страница ${page}`, `Page ${page}`)}
              </span>
              {page > 1 && (
                <Button asChild variant="secondary">
                  <Link href={`/admin?view=production&page=${page - 1}`}>
                    {text("Назад", "Previous")}
                  </Link>
                </Button>
              )}
              {page * 4 < queue.sheets.length && (
                <Button asChild variant="secondary">
                  <Link href={`/admin?view=production&page=${page + 1}`}>
                    {text("Далее", "Next")}
                  </Link>
                </Button>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav
              className="flex flex-wrap gap-1"
              aria-label={text("Статус заказа", "Order status")}
            >
              {(["SUBMITTED", "APPROVED", "REJECTED", "PRINTED"] as const).map(
                (value) => (
                  <Link
                    key={value}
                    href={`/admin?status=${value}`}
                    aria-current={value === status ? "page" : undefined}
                    className={`rounded-full px-3 py-3 text-sm font-semibold ${value === status ? "bg-slate-900 text-white dark:bg-sky-400 dark:text-slate-950" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {t(
                      `admin.${{ SUBMITTED: "tabSubmitted", APPROVED: "tabApproved", REJECTED: "tabRejected", PRINTED: "tabPrinted" }[value]}`,
                    )}
                  </Link>
                ),
              )}
            </nav>
            <form className="flex w-full gap-2 sm:w-auto" action="/admin">
              <input type="hidden" name="status" value={status} />
              <input
                aria-label={text("Найти заказ", "Find order")}
                className="studio-input sm:w-64"
                name="q"
                defaultValue={q}
                placeholder={text("Имя, email или ID", "Name, email or ID")}
              />
              <Button
                type="submit"
                size="icon"
                variant="secondary"
                aria-label={text("Поиск", "Search")}
              >
                <Search size={17} />
              </Button>
            </form>
          </div>
          {!stickers.length ? (
            <EmptyState
              title={text("Здесь пока нет заказов", "No orders here yet")}
              description={
                q
                  ? text(
                      "Попробуйте другой поисковый запрос.",
                      "Try a different search.",
                    )
                  : text(
                      "Новые макеты появятся после отправки пользователями.",
                      "New submissions will appear here.",
                    )
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {stickers.map((sticker) => (
                <article
                  key={sticker.id}
                  className="soft-card overflow-hidden rounded-[24px] p-4"
                >
                  <div className="flex gap-4">
                    <a
                      href={`/editor/${sticker.id}`}
                      className="block h-24 w-24 shrink-0 overflow-hidden rounded-2xl border bg-white sm:h-32 sm:w-32"
                    >
                      <img
                        src={`/api/stickers/${sticker.id}/asset?variant=preview`}
                        alt={t("common.stickerPreviewAlt", { id: sticker.id })}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </a>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2">
                        <StatusBadge status={sticker.status} />
                      </div>
                      <h2 className="truncate font-semibold">
                        {sticker.user.name}
                      </h2>
                      <p className="break-all text-xs text-muted-foreground">
                        {sticker.user.email}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(
                          locale,
                          sticker.submittedAt ?? sticker.createdAt,
                          "—",
                        )}
                      </p>
                      <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                        {sticker.id}
                      </p>
                    </div>
                  </div>
                  {sticker.rejectReason && (
                    <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
                      {sticker.rejectReason}
                    </p>
                  )}
                  <div className="my-3 flex flex-wrap gap-4 text-xs font-bold text-sky-700 dark:text-sky-300">
                    <a
                      href={`/api/stickers/${sticker.id}/asset?variant=final&download=1`}
                    >
                      PNG · 42 {text("мм", "mm")}
                    </a>
                    <a href={`/api/admin/production/sticker/${sticker.id}`}>
                      SVG · {text("Контур реза", "Cut outline")}
                    </a>
                  </div>
                  <ModerationActions
                    stickerId={sticker.id}
                    status={sticker.status}
                  />
                </article>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {text(
                `Найдено: ${total} · Страница ${page}`,
                `${total} results · Page ${page}`,
              )}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Button asChild variant="secondary">
                  <Link href={href(page - 1)}>{text("Назад", "Previous")}</Link>
                </Button>
              )}
              {page * pageSize < total && (
                <Button asChild variant="secondary">
                  <Link href={href(page + 1)}>{text("Далее", "Next")}</Link>
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
