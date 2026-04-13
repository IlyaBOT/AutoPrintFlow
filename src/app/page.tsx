import Link from "next/link";
import { ArrowRight, Layers3, ShieldCheck, Sticker, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getQueueStatsFromDb } from "@/lib/queue-data";

export default async function HomePage() {
  const [user, stats] = await Promise.all([getCurrentUser(), getQueueStatsFromDb()]);
  const ctaHref = user ? "/editor/new" : "/login";

  return (
    <main className="page-shell space-y-10">
      <section className="glass-panel overflow-hidden rounded-[40px] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-center">
          <div className="space-y-7">
            <div className="section-kicker">Sticker Upload To Print Queue</div>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                AutoPrintFlow turns uploaded artwork into moderated, print-ready sticker sheets.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Users upload their own image, place it inside a square sticker frame, preview the result, and submit it for moderation. Admins review the queue, group approved stickers into stripes and A4 sheets, and download production PNGs on demand.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={ctaHref}>
                  Create layout
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/register"}>
                  {user ? "Open workspace" : "Create account"}
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/60 bg-hero-glow p-5 shadow-panel">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-panel rounded-[28px] p-4">
                <UploadCloud className="h-5 w-5 text-sky-700" />
                <div className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">1. Upload</div>
                <p className="mt-2 text-sm text-slate-700">PNG, JPG, and WEBP uploads stay private to the owner.</p>
              </div>
              <div className="glass-panel rounded-[28px] p-4">
                <Sticker className="h-5 w-5 text-sky-700" />
                <div className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">2. Edit</div>
                <p className="mt-2 text-sm text-slate-700">Square editor with move, zoom, stretch, rotate, fit, and fill controls.</p>
              </div>
              <div className="glass-panel rounded-[28px] p-4">
                <ShieldCheck className="h-5 w-5 text-sky-700" />
                <div className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">3. Moderate</div>
                <p className="mt-2 text-sm text-slate-700">Submitted stickers require admin approval before they enter the print queue.</p>
              </div>
              <div className="glass-panel rounded-[28px] p-4">
                <Layers3 className="h-5 w-5 text-sky-700" />
                <div className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">4. Export</div>
                <p className="mt-2 text-sm text-slate-700">Approved items are grouped into stripes of 8 and A4 sheets of 3 stripes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard label="Queue Stickers" value={stats.totalApprovedStickers} helper="Approved and waiting for print" />
        <StatsCard label="Queue Stripes" value={stats.totalStripes} helper="Ceiling math: 8 stickers per stripe" />
        <StatsCard label="A4 Sheets" value={stats.totalSheets} helper="3 stripes per landscape sheet" />
        <StatsCard label="Waiting Review" value={stats.submittedCount} helper="Submitted to admins" />
        <StatsCard label="Printed Archive" value={stats.printedCount} helper="Already marked as printed" />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Upload and edit flow</CardTitle>
            <CardDescription>Users start with a private upload, then move and scale artwork inside the square editor before the final PNG is generated.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            Each sticker keeps the original upload, editor transform state, generated preview, and print-ready 496x496 px export. No uploaded sticker is exposed publicly.
          </CardContent>
        </Card>
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Moderation and queueing</CardTitle>
            <CardDescription>Only approved stickers count toward printable queue stats and printable exports.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            Submitted items remain pending until an admin approves or rejects them. Approved stickers are ordered by approval time, then packed into stripes and A4 sheets deterministically.
          </CardContent>
        </Card>
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>Protected downloads</CardTitle>
            <CardDescription>The app serves sticker, stripe, and A4 assets through checked routes instead of exposing storage directly.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            Users can download only their own stickers. Admins can download individual stickers, stripes, and full A4 sheet layouts with the same server-side authorization model.
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
