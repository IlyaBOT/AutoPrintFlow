import Link from "next/link";
import {
  ArrowUpRight,
  Upload,
  SlidersHorizontal,
  Printer,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getLocale } from "@/lib/i18n-server";
import { getQueueStatsFromDb } from "@/lib/queue-data";

export default async function HomePage() {
  const [user, stats, locale] = await Promise.all([
    getCurrentUser(),
    getQueueStatsFromDb(),
    getLocale(),
  ]);
  const ru = locale === "ru",
    text = (a: string, b: string) => (ru ? a : b);
  return (
    <main className="page-shell space-y-5 sm:space-y-8">
      <section className="glass-panel relative overflow-hidden rounded-[32px] p-5 sm:p-8 lg:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200">
              <Sparkles size={14} />
              {text(
                "Маленький формат. Большие идеи.",
                "Small format. Big ideas.",
              )}
            </div>
            <h1 className="max-w-xl text-[2.65rem] font-semibold leading-[1.08] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              {text("Твои идеи.", "Your ideas.")}
              <br />
              <span className="text-sky-600 dark:text-sky-400">
                {text("В форме стикера.", "Made to stick.")}
              </span>
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              {text(
                "Логотип, любимый персонаж или свой рисунок. Загрузи изображение, настрой макет и отправь его на печать.",
                "A logo, a favourite character or your own artwork. Upload an image, make it yours and send it to print.",
              )}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user ? "/editor/new" : "/login"}>
                  {text("Создать стикер", "Create a sticker")}
                  <ArrowUpRight size={18} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link
                  href={
                    user
                      ? user.role === "ADMIN"
                        ? "/admin"
                        : "/dashboard"
                      : "/register"
                  }
                >
                  {user
                    ? text("Мои заказы", "My workspace")
                    : text("Регистрация", "Create account")}
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {[
                "42 × 42 " + text("мм", "mm"),
                "300 DPI",
                text("Квадрат или свой контур", "Square or custom outline"),
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check size={13} className="text-sky-600" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="sticker-showcase relative mx-auto flex h-[280px] w-full max-w-[460px] items-center justify-center rounded-[28px] border border-white/70 bg-gradient-to-br from-sky-100/80 via-indigo-50/70 to-rose-100/70 sm:h-[380px] dark:border-white/10 dark:from-sky-950/70 dark:via-slate-900 dark:to-indigo-950/70"
          >
            <div className="absolute left-[12%] top-[15%] flex h-28 w-28 rotate-[-14deg] flex-col items-center justify-center rounded-[26px] border-[7px] border-white bg-[#ffe06b] text-slate-950 shadow-xl sm:h-36 sm:w-36">
              <span className="text-4xl font-extrabold tracking-tighter sm:text-5xl">
                hey.
              </span>
              <span className="mt-1 text-[9px] font-bold tracking-[.2em]">
                MAKE IT YOURS
              </span>
            </div>
            <div className="absolute right-[13%] top-[29%] flex h-36 w-36 rotate-[12deg] items-center justify-center rounded-[32px] border-[7px] border-white bg-sky-500 shadow-xl sm:h-44 sm:w-44">
              <svg
                viewBox="0 0 100 100"
                className="h-24 w-24 text-white sm:h-32 sm:w-32"
                fill="none"
              >
                <path
                  d="M20 68C20 37 42 21 62 25C85 30 85 59 64 69C48 77 36 62 44 51C49 44 58 45 61 51"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <circle cx="24" cy="78" r="6" fill="currentColor" />
              </svg>
            </div>
            <div className="absolute bottom-[13%] left-[22%] flex rotate-[-5deg] items-center gap-2 rounded-full border-[5px] border-white bg-slate-950 px-5 py-3 text-sm font-bold tracking-tight text-white shadow-lg">
              <Sparkles size={18} className="text-[#ffe06b]" />
              CREATE SOMETHING.
            </div>
          </div>
        </div>
      </section>
      <section
        className="grid grid-cols-3 gap-2 sm:gap-4"
        aria-label={text("Состояние мастерской", "Workshop status")}
      >
        {[
          [stats.totalApprovedStickers, text("В очереди", "Queued")],
          [stats.submittedCount, text("На проверке", "In review")],
          [stats.printedCount, text("Напечатано", "Printed")],
        ].map(([value, label]) => (
          <div key={label} className="soft-card rounded-[22px] p-4 sm:p-5">
            <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
              {value}
            </div>
            <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {label}
            </div>
          </div>
        ))}
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        {[
          {
            icon: Upload,
            title: text("01. Загрузи", "01. Upload"),
            body: text(
              "PNG, JPG или WebP до 12 МБ. Для фигурного стикера выбирай изображение с прозрачным фоном.",
              "PNG, JPG or WebP up to 12 MB. Use a transparent background for a custom outline.",
            ),
          },
          {
            icon: SlidersHorizontal,
            title: text("02. Настрой", "02. Make it yours"),
            body: text(
              "Обрезай, поворачивай и меняй масштаб. Направляющие помогут оставить запас для аккуратного реза.",
              "Crop, rotate and resize. Guides help you leave a margin for a clean cut.",
            ),
          },
          {
            icon: Printer,
            title: text("03. Отправь на печать", "03. Send to print"),
            body: text(
              "Мы проверим макет и добавим его на печатный лист. Статус заказа всегда доступен в личном кабинете.",
              "We review your artwork and add it to a print sheet. Follow its status in your workspace.",
            ),
          },
        ].map(({ icon: Icon, title, body }) => (
          <article key={title} className="soft-card rounded-[24px] p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <Icon size={20} />
              </div>
              <h2 className="font-semibold">{title}</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{body}</p>
          </article>
        ))}
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-3 px-1 pb-2 text-xs text-muted-foreground">
        <span>
          AutoPrintFlow ·{" "}
          {text("Сделано для твоих идей", "Made for your ideas")}
        </span>
        <Link className="underline-offset-4 hover:underline" href="/privacy">
          {text("Конфиденциальность", "Privacy")}
        </Link>
      </footer>
    </main>
  );
}
