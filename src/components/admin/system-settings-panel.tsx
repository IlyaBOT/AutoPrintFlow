"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "ADMIN";
  isBanned: boolean;
  banReason: string | null;
  stickerCount: number;
};

type StickerRow = {
  id: string;
  status: string;
  createdAt: string;
  userName: string;
  userEmail: string;
};

type PrintProfileRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  productionUnit: string;
  acceptsMaterials: boolean;
  materials: Array<{
    id: number;
    name: string;
    weightGsm: number | null;
    finish: string | null;
    description: string | null;
    isDefault: boolean;
  }>;
};

export function SystemSettingsPanel({
  initialSettings,
  users,
  stickers,
  printProfiles,
}: {
  initialSettings: {
    instanceName: string;
    stripeFooterText: string;
    stripeFooterFontSizePt: number;
    hasInstanceIcon: boolean;
    hasStripeBackground: boolean;
  };
  users: UserRow[];
  stickers: StickerRow[];
  printProfiles: PrintProfileRow[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [instanceName, setInstanceName] = useState(initialSettings.instanceName);
  const [stripeFooterText, setStripeFooterText] = useState(initialSettings.stripeFooterText);
  const [stripeFooterFontSizePt, setStripeFooterFontSizePt] = useState(String(initialSettings.stripeFooterFontSizePt));
  const [instanceIcon, setInstanceIcon] = useState<File | null>(null);
  const [stripeBackground, setStripeBackground] = useState<File | null>(null);
  const [removeInstanceIcon, setRemoveInstanceIcon] = useState(false);
  const [removeStripeBackground, setRemoveStripeBackground] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [materialDrafts, setMaterialDrafts] = useState<Record<number, { name: string; weightGsm: string; finish: string }>>({});

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.set("instanceName", instanceName);
      formData.set("stripeFooterText", stripeFooterText);
      formData.set("stripeFooterFontSizePt", stripeFooterFontSizePt);
      if (instanceIcon) formData.set("instanceIcon", instanceIcon);
      if (stripeBackground) formData.set("stripeBackground", stripeBackground);
      if (removeInstanceIcon) formData.set("removeInstanceIcon", "1");
      if (removeStripeBackground) formData.set("removeStripeBackground", "1");

      const response = await fetch("/api/admin/system-settings", { method: "POST", body: formData });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? t("systemSettings.saveFailed"));
      toast.success(result.message ?? t("systemSettings.saved"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("systemSettings.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBan(userId: string, banned: boolean) {
    const reason = banned ? window.prompt(t("systemSettings.banPrompt")) ?? "" : "";
    const response = await fetch(`/api/admin/users/${userId}/ban`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned, reason }),
    });
    const result = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      toast.error(result.error ?? t("systemSettings.userActionFailed"));
      return;
    }
    toast.success(result.message ?? t("systemSettings.saved"));
    router.refresh();
  }

  async function handleDelete(userId: string) {
    if (!window.confirm(t("systemSettings.deleteUserConfirm"))) {
      return;
    }

    const response = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      toast.error(result.error ?? t("systemSettings.userActionFailed"));
      return;
    }
    toast.success(result.message ?? t("systemSettings.userDeleted"));
    router.refresh();
  }

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!importFile) {
      toast.error(t("systemSettings.importMissingFile"));
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.set("file", importFile);
      const response = await fetch("/api/admin/system-settings/import", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? t("systemSettings.importFailed"));
      toast.success(result.message ?? t("systemSettings.imported"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("systemSettings.importFailed"));
    } finally {
      setIsImporting(false);
    }
  }

  async function handleDeleteSticker(stickerId: string) {
    if (!window.confirm(t("systemSettings.deleteStickerConfirm"))) {
      return;
    }

    const response = await fetch(`/api/admin/content/stickers/${stickerId}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      toast.error(result.error ?? t("systemSettings.userActionFailed"));
      return;
    }
    toast.success(result.message ?? t("systemSettings.stickerDeleted"));
    router.refresh();
  }

  async function handleClearGenerated() {
    const response = await fetch("/api/admin/content/generated/clear", { method: "POST" });
    const result = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      toast.error(result.error ?? t("systemSettings.userActionFailed"));
      return;
    }
    toast.success(result.message ?? t("systemSettings.generatedCleared"));
    router.refresh();
  }

  async function handleAddMaterial(profileId: number) {
    const draft = materialDrafts[profileId] ?? { name: "", weightGsm: "", finish: "" };
    const response = await fetch("/api/admin/print/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        name: draft.name,
        weightGsm: draft.weightGsm ? Number(draft.weightGsm) : null,
        finish: draft.finish || null,
      }),
    });
    const result = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      toast.error(result.error ?? t("printProfiles.materialSaveFailed"));
      return;
    }
    toast.success(result.message ?? t("printProfiles.materialAdded"));
    setMaterialDrafts((current) => ({ ...current, [profileId]: { name: "", weightGsm: "", finish: "" } }));
    router.refresh();
  }

  async function handleDeleteMaterial(materialId: number) {
    const response = await fetch(`/api/admin/print/materials/${materialId}`, { method: "DELETE" });
    const result = (await response.json()) as { error?: string; message?: string };
    if (!response.ok) {
      toast.error(result.error ?? t("printProfiles.materialSaveFailed"));
      return;
    }
    toast.success(result.message ?? t("printProfiles.materialDeleted"));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>{t("systemSettings.backupTitle")}</CardTitle>
          <CardDescription>{t("systemSettings.backupDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)] xl:items-end">
          <Button asChild type="button">
            <a href="/api/admin/system-settings/export">{t("systemSettings.exportDatabase")}</a>
          </Button>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleImport}>
            <div className="flex-1 space-y-2">
              <Label htmlFor="backup-file">{t("systemSettings.importDatabase")}</Label>
              <Input id="backup-file" type="file" accept=".sql,application/sql,text/plain" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} />
            </div>
            <Button disabled={isImporting} type="submit" variant="secondary">{t("systemSettings.importDatabase")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>{t("printProfiles.title")}</CardTitle>
          <CardDescription>{t("printProfiles.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {printProfiles.map((profile) => (
            <div key={profile.id} className="rounded-[24px] border border-white/60 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-950/40">
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{profile.name}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {profile.type} · {profile.productionUnit}
                </div>
                {profile.description ? (
                  <div className="text-sm text-slate-600 dark:text-slate-300">{profile.description}</div>
                ) : null}
              </div>
              {profile.acceptsMaterials ? (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
                    <Input
                      placeholder={t("printProfiles.materialName")}
                      value={materialDrafts[profile.id]?.name ?? ""}
                      onChange={(event) =>
                        setMaterialDrafts((current) => ({
                          ...current,
                          [profile.id]: {
                            name: event.target.value,
                            weightGsm: current[profile.id]?.weightGsm ?? "",
                            finish: current[profile.id]?.finish ?? "",
                          },
                        }))
                      }
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder={t("printProfiles.materialWeight")}
                      value={materialDrafts[profile.id]?.weightGsm ?? ""}
                      onChange={(event) =>
                        setMaterialDrafts((current) => ({
                          ...current,
                          [profile.id]: {
                            name: current[profile.id]?.name ?? "",
                            weightGsm: event.target.value,
                            finish: current[profile.id]?.finish ?? "",
                          },
                        }))
                      }
                    />
                    <Input
                      placeholder={t("printProfiles.materialFinish")}
                      value={materialDrafts[profile.id]?.finish ?? ""}
                      onChange={(event) =>
                        setMaterialDrafts((current) => ({
                          ...current,
                          [profile.id]: {
                            name: current[profile.id]?.name ?? "",
                            weightGsm: current[profile.id]?.weightGsm ?? "",
                            finish: event.target.value,
                          },
                        }))
                      }
                    />
                    <Button type="button" variant="secondary" onClick={() => handleAddMaterial(profile.id)}>
                      {t("printProfiles.addMaterial")}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {profile.materials.map((material) => (
                      <div key={material.id} className="flex flex-col gap-2 rounded-2xl border border-white/60 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-slate-900/55 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-slate-700 dark:text-slate-200">
                          <span className="font-semibold">{material.name}</span>
                          {material.weightGsm ? ` · ${material.weightGsm} g/m²` : ""}
                          {material.finish ? ` · ${material.finish}` : ""}
                          {material.isDefault ? ` · ${t("printProfiles.defaultMaterial")}` : ""}
                        </div>
                        <Button type="button" variant="ghost" onClick={() => handleDeleteMaterial(material.id)}>
                          {t("printProfiles.deleteMaterial")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-muted-foreground">{t("printProfiles.noMaterialsRequired")}</div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>{t("systemSettings.layoutTitle")}</CardTitle>
          <CardDescription>{t("systemSettings.layoutDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 xl:grid-cols-2" onSubmit={saveSettings}>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="instanceName">{t("systemSettings.instanceName")}</Label>
              <Input id="instanceName" value={instanceName} onChange={(event) => setInstanceName(event.target.value)} />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="stripeFooterText">{t("systemSettings.footerText")}</Label>
              <Textarea id="stripeFooterText" value={stripeFooterText} onChange={(event) => setStripeFooterText(event.target.value)} />
              <p className="text-sm text-muted-foreground">{t("systemSettings.footerHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stripeFooterFontSizePt">{t("systemSettings.footerFontSize")}</Label>
              <Input id="stripeFooterFontSizePt" type="number" min={8} max={72} value={stripeFooterFontSizePt} onChange={(event) => setStripeFooterFontSizePt(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instanceIcon">{t("systemSettings.instanceIcon")}</Label>
              <Input id="instanceIcon" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => setInstanceIcon(event.target.files?.[0] ?? null)} />
              {initialSettings.hasInstanceIcon ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={removeInstanceIcon} onChange={(event) => setRemoveInstanceIcon(event.target.checked)} />{t("systemSettings.removeCurrentIcon")}</label>
              ) : null}
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="stripeBackground">{t("systemSettings.stripeBackground")}</Label>
              <Input id="stripeBackground" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => setStripeBackground(event.target.files?.[0] ?? null)} />
              {initialSettings.hasStripeBackground ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={removeStripeBackground} onChange={(event) => setRemoveStripeBackground(event.target.checked)} />{t("systemSettings.removeCurrentBackground")}</label>
              ) : null}
              <p className="text-sm text-muted-foreground">{t("systemSettings.backgroundHint")}</p>
            </div>
            <div className="xl:col-span-2">
              <Button disabled={isSaving} type="submit">{t("systemSettings.save")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>{t("systemSettings.userManagementTitle")}</CardTitle>
          <CardDescription>{t("systemSettings.userManagementDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 rounded-[24px] border border-white/60 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-950/40 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{user.name}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{user.email} · {user.role} · {user.stickerCount} {t("systemSettings.stickersCount")}</div>
                {user.banReason ? <div className="text-sm text-red-500">{user.banReason}</div> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => handleBan(user.id, !user.isBanned)}>
                  {user.isBanned ? t("systemSettings.unbanUser") : t("systemSettings.banUser")}
                </Button>
                <Button type="button" variant="destructive" onClick={() => handleDelete(user.id)}>
                  {t("systemSettings.deleteUser")}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>{t("systemSettings.contentManagementTitle")}</CardTitle>
          <CardDescription>{t("systemSettings.contentManagementDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={handleClearGenerated}>
              {t("systemSettings.clearGenerated")}
            </Button>
          </div>
          <div className="space-y-3">
            {stickers.map((sticker) => (
              <div key={sticker.id} className="flex flex-col gap-3 rounded-[24px] border border-white/60 bg-white/50 p-4 dark:border-white/10 dark:bg-slate-950/40 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{sticker.id}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {t("systemSettings.ownerLabel")}: {sticker.userName} ({sticker.userEmail})
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">
                    {t("systemSettings.statusLabel")}: {sticker.status}
                  </div>
                </div>
                <Button type="button" variant="destructive" onClick={() => handleDeleteSticker(sticker.id)}>
                  {t("systemSettings.deleteSticker")}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
