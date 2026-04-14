import { AccountSettingsPanel } from "@/components/admin/account-settings-panel";
import { AdminTabsNav } from "@/components/admin/admin-tabs-nav";
import { requireAdminPage } from "@/lib/auth/guards";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function AdminAccountPage() {
  const [user, locale] = await Promise.all([requireAdminPage(), getLocale()]);
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);

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
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{t("admin.accountTitle")}</h1>
          <p className="mt-2 text-slate-600">{t("admin.accountDescription")}</p>
        </div>
        <AdminTabsNav tabs={tabs} active="/admin/account" />
      </section>
      <AccountSettingsPanel initialName={user.name} initialEmail={user.email} />
    </main>
  );
}
