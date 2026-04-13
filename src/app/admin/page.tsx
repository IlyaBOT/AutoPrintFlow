import type { StickerStatus } from "@prisma/client";

import { ModerationActions } from "@/components/admin/moderation-actions";
import { SheetCard } from "@/components/admin/sheet-card";
import { StatusBadge } from "@/components/status-badge";
import { StatsCard } from "@/components/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminPage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getApprovedQueueLayout, getQueueStatsFromDb } from "@/lib/queue-data";
import { formatDate } from "@/lib/utils";

function ModerationList({
  title,
  description,
  stickers,
  showActions = false,
}: {
  title: string;
  description: string;
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
                alt={`Sticker ${sticker.id}`}
                className="aspect-square w-full rounded-[24px] border border-white/60 bg-white object-cover p-2"
              />
              <div className="space-y-3 text-sm text-slate-600">
                <div>ID: {sticker.id}</div>
                <div>Created: {formatDate(sticker.createdAt)}</div>
                <div>Submitted: {formatDate(sticker.submittedAt)}</div>
                <div>Approved: {formatDate(sticker.approvedAt)}</div>
                <div>Printed: {formatDate(sticker.printedAt)}</div>
                {sticker.rejectReason ? <div>Reject reason: {sticker.rejectReason}</div> : null}
                <div className="flex flex-wrap gap-3">
                  <a className="text-sm font-semibold text-sky-700" href={`/api/stickers/${sticker.id}/asset?variant=final&download=1`}>
                    Download sticker PNG
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
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard label="Submitted" value={stats.submittedCount} helper="Waiting for admin moderation" />
        <StatsCard label="Approved" value={stats.approvedWaitingCount} helper="Printable queue size" />
        <StatsCard label="Stripes" value={stats.totalStripes} helper="8 stickers per stripe" />
        <StatsCard label="A4 Sheets" value={stats.totalSheets} helper="3 stripes per sheet" />
        <StatsCard label="Printed" value={stats.printedCount} helper="Archived as printed" />
      </section>

      <section className="space-y-4">
        <div>
          <div className="section-kicker">Printable queue</div>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">A4 sheets grouped from approved stickers</h2>
        </div>
        {queueLayout.sheets.length === 0 ? (
          <EmptyState
            title="No printable sheets yet"
            description="Approved stickers will appear here automatically, grouped by approval time into stripes and landscape A4 sheets."
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
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="printed">Printed</TabsTrigger>
          </TabsList>
          <TabsContent value="submitted">
            <ModerationList
              title="Pending moderation"
              description="Approve or reject submitted stickers before they enter the printable queue."
              stickers={submitted}
              showActions
            />
          </TabsContent>
          <TabsContent value="approved">
            <ModerationList
              title="Approved queue"
              description="Approved stickers are already packed into queue sheets. Use mark printed when production is complete."
              stickers={approved}
              showActions
            />
          </TabsContent>
          <TabsContent value="rejected">
            <ModerationList
              title="Rejected stickers"
              description="Rejected items remain visible for audit and can be reworked by the user."
              stickers={rejected}
            />
          </TabsContent>
          <TabsContent value="printed">
            <ModerationList
              title="Printed archive"
              description="Archive of stickers already marked as printed."
              stickers={printed}
            />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
