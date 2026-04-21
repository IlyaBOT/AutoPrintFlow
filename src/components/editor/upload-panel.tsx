"use client";

import { startTransition, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/security/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NerdIcon } from "@/components/ui/nerd-icon";

export function UploadPanel({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const captchaEnabled = Boolean(turnstileSiteKey);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      toast.error(t("upload.chooseImage"));
      return;
    }

    if (captchaEnabled && !turnstileToken) {
      toast.error(t("security.humanCheckRequired"));
      return;
    }

    setIsPending(true);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("website", String(formData.get("website") ?? ""));
      uploadData.append("turnstileToken", turnstileToken ?? "");

      const response = await fetch("/api/stickers/upload", {
        method: "POST",
        body: uploadData,
      });

      const result = (await response.json()) as { error?: string; stickerId?: string };

      if (!response.ok || !result.stickerId) {
        throw new Error(result.error ?? t("upload.uploadFailed"));
      }

      toast.success(t("upload.imageUploaded"));
      startTransition(() => {
        router.push(`/editor/${result.stickerId}`);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("upload.uploadFailed"));
    } finally {
      if (captchaEnabled) {
        setTurnstileToken(null);
        turnstileRef.current?.reset();
      }
      setIsPending(false);
    }
  }

  return (
    <Card className="rounded-[36px]">
      <CardHeader className="space-y-3">
        <div className="section-kicker">{t("upload.step")}</div>
        <CardTitle className="text-3xl">{t("upload.title")}</CardTitle>
        <CardDescription>
          {t("upload.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleUpload}>
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden="true"
          />
          <label
            htmlFor="file"
            className="group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-[32px] border border-dashed border-sky-300/80 bg-gradient-to-br from-white/75 to-sky-50/70 p-6 text-center transition hover:border-sky-400 hover:bg-white/85 dark:border-slate-700 dark:from-slate-900 dark:to-slate-900 dark:hover:border-sky-500 dark:hover:from-slate-800 dark:hover:to-slate-800"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-slate-950 text-white shadow-lg shadow-slate-900/15 dark:bg-sky-400 dark:text-slate-950">
              <NerdIcon className="text-xl" name="upload" />
            </div>
            <div className="text-lg font-semibold text-slate-950 dark:text-slate-100">
              {fileName ?? t("upload.dropzoneTitle")}
            </div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              {t("upload.dropzoneDescription")}
            </p>
            <input
              ref={inputRef}
              id="file"
              name="file"
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => {
                const nextFile = event.currentTarget.files?.[0];
                setFileName(nextFile?.name ?? null);
              }}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-2xl bg-white/60 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/55 dark:text-slate-300">
              {t("upload.recommended")}
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? <NerdIcon className="text-sm" name="spinner" spin /> : <NerdIcon className="text-sm" name="image" />}
              {t("upload.continueToEditor")}
            </Button>
          </div>
          {captchaEnabled && turnstileSiteKey ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("security.humanCheck")}
              </div>
              <TurnstileWidget
                ref={turnstileRef}
                action="upload"
                siteKey={turnstileSiteKey}
                onTokenChange={setTurnstileToken}
              />
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
