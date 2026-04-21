import Link from "next/link";

import { Button } from "@/components/ui/button";
import { NerdIcon } from "@/components/ui/nerd-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/stats-card";
import { getCurrentUser } from "@/lib/auth/session";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { getQueueStatsFromDb } from "@/lib/queue-data";

export default async function HomePage() {
  const [user, stats, locale] = await Promise.all([getCurrentUser(), getQueueStatsFromDb(), getLocale()]);
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);
  const ctaHref = user ? "/editor/new" : "/login";
  const isRu = locale === "ru";

  return (
    <main className="page-shell space-y-10">
      <section className="glass-panel overflow-hidden rounded-[40px] p-6 sm:p-8 lg:p-10">
        <div className={`grid gap-10 lg:items-center ${isRu ? "lg:grid-cols-[minmax(0,1.1fr)_480px]" : "lg:grid-cols-[minmax(0,1.1fr)_420px]"}`}>
          <div className="space-y-7">
            <div className="section-kicker">{t("home.kicker")}</div>
            <div className="space-y-4">
              <h1 className={`max-w-3xl font-semibold tracking-tight text-slate-950 ${isRu ? "text-4xl leading-[1.02] sm:text-[4.4rem] lg:text-[58px]" : "text-4xl sm:text-5xl lg:text-6xl"}`}>
                {t("home.title")}
              </h1>
              <p className={`max-w-2xl text-slate-600 ${isRu ? "text-base leading-7 sm:text-[1.02rem]" : "text-lg leading-8"}`}>
                {t("home.description")}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={ctaHref}>
                  {t("header.createLayout")}
                  <NerdIcon className="text-sm" name="arrowRight" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={user ? (user.role === "ADMIN" ? "/admin" : "/dashboard") : "/register"}>
                  {user ? t("home.openWorkspace") : t("header.createAccount")}
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[36px] border border-white/60 bg-hero-glow p-5 shadow-panel dark:border-white/10">
            <div className="grid grid-cols-2 gap-4">
              <div className="hero-feature-card">
                <NerdIcon className="text-4xl font-black leading-none text-sky-700" name="upload" />
                <div className={`mt-5 font-semibold uppercase tracking-[0.2em] text-slate-500 ${isRu ? "text-[0.82rem]" : "text-sm"}`}>{t("home.featureUploadTitle")}</div>
                <p className={`mt-2 text-slate-700 ${isRu ? "text-[0.94rem] leading-7" : "text-sm"}`}>{t("home.featureUploadDescription")}</p>
              </div>
              <div className="hero-feature-card">
                <NerdIcon className="text-4xl font-black leading-none text-sky-700" name="edit" />
                <div className={`mt-5 font-semibold uppercase tracking-[0.2em] text-slate-500 ${isRu ? "text-[0.82rem]" : "text-sm"}`}>{t("home.featureEditTitle")}</div>
                <p className={`mt-2 text-slate-700 ${isRu ? "text-[0.94rem] leading-7" : "text-sm"}`}>{t("home.featureEditDescription")}</p>
              </div>
              <div className="hero-feature-card">
                <NerdIcon className="text-4xl font-black leading-none text-sky-700" name="shield" />
                <div className={`mt-5 font-semibold uppercase tracking-[0.2em] text-slate-500 ${isRu ? "text-[0.82rem]" : "text-sm"}`}>{t("home.featureModerateTitle")}</div>
                <p className={`mt-2 text-slate-700 ${isRu ? "text-[0.94rem] leading-7" : "text-sm"}`}>{t("home.featureModerateDescription")}</p>
              </div>
              <div className="hero-feature-card">
                <NerdIcon className="text-4xl font-black leading-none text-sky-700" name="layers" />
                <div className={`mt-5 font-semibold uppercase tracking-[0.2em] text-slate-500 ${isRu ? "text-[0.82rem]" : "text-sm"}`}>{t("home.featureExportTitle")}</div>
                <p className={`mt-2 text-slate-700 ${isRu ? "text-[0.94rem] leading-7" : "text-sm"}`}>{t("home.featureExportDescription")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatsCard label={t("home.statsQueueStickersLabel")} value={stats.totalApprovedStickers} helper={t("home.statsQueueStickersHelper")} />
        <StatsCard label={t("home.statsQueueStripesLabel")} value={stats.totalStripes} helper={t("home.statsQueueStripesHelper")} />
        <StatsCard label={t("home.statsSheetsLabel")} value={stats.totalSheets} helper={t("home.statsSheetsHelper")} />
        <StatsCard label={t("home.statsWaitingReviewLabel")} value={stats.submittedCount} helper={t("home.statsWaitingReviewHelper")} />
        <StatsCard label={t("home.statsPrintedLabel")} value={stats.printedCount} helper={t("home.statsPrintedHelper")} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>{t("home.uploadEditTitle")}</CardTitle>
            <CardDescription>{t("home.uploadEditDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            {t("home.uploadEditBody")}
          </CardContent>
        </Card>
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>{t("home.moderationTitle")}</CardTitle>
            <CardDescription>{t("home.moderationDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            {t("home.moderationBody")}
          </CardContent>
        </Card>
        <Card className="rounded-[32px]">
          <CardHeader>
            <CardTitle>{t("home.protectedTitle")}</CardTitle>
            <CardDescription>{t("home.protectedDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            {t("home.protectedBody")}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
