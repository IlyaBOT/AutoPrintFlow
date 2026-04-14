import { AdminTabsNav } from "@/components/admin/admin-tabs-nav";
import { SystemSettingsPanel } from "@/components/admin/system-settings-panel";
import { requireAdminPage } from "@/lib/auth/guards";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/system-settings";

export default async function AdminSystemSettingsPage() {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);

  await requireAdminPage();

  const [settings, users, stickers, printProfiles] = await Promise.all([
    getSystemSettings(),
    prisma.user.findMany({
      orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        banReason: true,
        _count: { select: { stickers: true } },
      },
    }),
    prisma.sticker.findMany({
      orderBy: { createdAt: "desc" },
      take: 16,
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.printProfile.findMany({
      orderBy: { id: "asc" },
      include: {
        materials: {
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    }),
  ]);

  const tabs = [
    { href: "/admin/account", label: t("admin.accountTab") },
    { href: "/admin", label: t("admin.printQueueTab") },
    { href: "/admin/system-settings", label: t("admin.systemSettingsTab") },
  ];

  return (
    <main className="page-shell space-y-8">
      <section className="space-y-4">
        <div>
          <div className="section-kicker">{t("admin.portalKicker")}</div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{t("systemSettings.pageTitle")}</h1>
          <p className="mt-2 text-slate-600">{t("systemSettings.pageDescription")}</p>
        </div>
        <AdminTabsNav tabs={tabs} active="/admin/system-settings" />
      </section>
      <SystemSettingsPanel
        initialSettings={{
          instanceName: settings.instanceName,
          stripeFooterText: settings.stripeFooterText,
          stripeFooterFontSizePt: settings.stripeFooterFontSizePt,
          hasInstanceIcon: Boolean(settings.instanceIconFilePath),
          hasStripeBackground: Boolean(settings.stripeBackgroundPath),
        }}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isBanned: user.isBanned,
          banReason: user.banReason,
          stickerCount: user._count.stickers,
        }))}
        stickers={stickers.map((sticker) => ({
          id: sticker.id,
          status: sticker.status,
          createdAt: sticker.createdAt.toISOString(),
          userName: sticker.user.name,
          userEmail: sticker.user.email,
        }))}
        printProfiles={printProfiles.map((profile) => ({
          id: profile.id,
          slug: profile.slug,
          name: profile.name,
          description: profile.description,
          type: profile.type,
          productionUnit: profile.productionUnit,
          acceptsMaterials: profile.acceptsMaterials,
          materials: profile.materials.map((material) => ({
            id: material.id,
            name: material.name,
            weightGsm: material.weightGsm,
            finish: material.finish,
            description: material.description,
            isDefault: material.isDefault,
          })),
        }))}
      />
    </main>
  );
}
