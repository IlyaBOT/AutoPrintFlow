"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountSettingsPanel({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingProfile(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? t("account.profileUpdateFailed"));
      toast.success(result.message ?? t("account.profileUpdated"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("account.profileUpdateFailed"));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingPassword(true);

    try {
      const response = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? t("account.passwordUpdateFailed"));
      toast.success(result.message ?? t("account.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("account.passwordUpdateFailed"));
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const result = (await response.json()) as { error?: string; message?: string; redirectTo?: string };
      if (!response.ok) throw new Error(result.error ?? t("account.accountDeleteFailed"));
      toast.success(result.message ?? t("account.accountDeleted"));
      window.location.href = result.redirectTo ?? "/register";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("account.accountDeleteFailed"));
      setIsDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>{t("account.profileTitle")}</CardTitle>
          <CardDescription>{t("account.profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleProfileSave}>
            <div className="space-y-2">
              <Label htmlFor="account-name">{t("auth.nameLabel")}</Label>
              <Input id="account-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">{t("auth.emailLabel")}</Label>
              <Input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <Button disabled={isSavingProfile} type="submit">{t("account.saveProfile")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[32px]">
        <CardHeader>
          <CardTitle>{t("account.securityTitle")}</CardTitle>
          <CardDescription>{t("account.securityDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordSave}>
            <div className="space-y-2">
              <Label htmlFor="current-password">{t("account.currentPassword")}</Label>
              <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("account.newPassword")}</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <Button disabled={isSavingPassword} type="submit">{t("account.savePassword")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-red-500/30 xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-300">{t("account.deleteTitle")}</CardTitle>
          <CardDescription>{t("account.deleteDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={() => setDialogOpen(true)}>{t("account.deleteAction")}</Button>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("account.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("account.deleteConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-password">{t("account.enterPassword")}</Label>
            <Input id="delete-password" type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>{t("account.deleteAction")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
