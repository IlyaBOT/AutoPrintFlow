"use client";
import { useState } from "react";
import { Download, FileArchive, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
export function ProductionDownloads({
  sheetIndex,
  snapshot,
}: {
  sheetIndex: number;
  snapshot: string;
}) {
  const { locale } = useI18n();
  const [pending, setPending] = useState<string | null>(null);
  async function download(format: "psd" | "zip") {
    setPending(format);
    const downloadFailed =
      locale === "ru"
        ? "Скачивание прервалось. Повторите попытку."
        : "The download was interrupted. Try again.";
    try {
      const response = await fetch(
        `/api/admin/production/sheet/${sheetIndex}?format=${format}&${snapshot}`,
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? `${downloadFailed} (HTTP ${response.status})`,
        );
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `sheet-${sheetIndex}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      toast.error(
        error instanceof Error && !(error instanceof TypeError)
          ? error.message
          : downloadFailed,
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        disabled={pending !== null}
        onClick={() => download("psd")}
      >
        {pending === "psd" ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : (
          <Download size={16} />
        )}
        PSD
      </Button>
      <Button disabled={pending !== null} onClick={() => download("zip")}>
        {pending === "zip" ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : (
          <FileArchive size={16} />
        )}
        {pending
          ? locale === "ru"
            ? "Собираем…"
            : "Generating…"
          : locale === "ru"
            ? "Печать + резка"
            : "Print + cut"}
      </Button>
    </div>
  );
}
