"use client";
import { useState } from "react";
import { Download, FileArchive, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

const partSize = 4 * 1024 * 1024;
const maxPartAttempts = 3;

type ExportVersion = { etag: string; size: number };

async function fetchExportPart(
  url: string,
  start: number,
  version: ExportVersion | undefined,
  downloadFailed: string,
) {
  const end = start + partSize - 1;
  const headers = new Headers({ Range: `bytes=${start}-${end}` });
  if (version) headers.set("If-Match", version.etag);

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? `${downloadFailed} (HTTP ${response.status})`,
        );
      }
      if (response.status === 200 && !version) {
        const blob = await response.blob();
        return { blob, size: blob.size, etag: "" };
      }

      const etag = response.headers.get("ETag");
      const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
        response.headers.get("Content-Range") ?? "",
      );
      const size = Number(range?.[3]);
      const lastByte = Math.min(end, size - 1);
      if (
        response.status !== 206 ||
        !etag ||
        !Number.isSafeInteger(size) ||
        size <= start ||
        Number(range?.[1]) !== start ||
        Number(range?.[2]) !== lastByte ||
        (version && (version.etag !== etag || version.size !== size))
      ) {
        await response.body?.cancel();
        throw new Error(downloadFailed);
      }
      const blob = await response.blob();
      if (blob.size !== lastByte - start + 1)
        throw new TypeError(downloadFailed);
      return { blob, size, etag };
    } catch (error) {
      if (!(error instanceof TypeError) || attempt >= maxPartAttempts)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 350));
    }
  }
}

async function fetchExport(url: string, downloadFailed: string) {
  const first = await fetchExportPart(url, 0, undefined, downloadFailed);
  if (first.blob.size === first.size) return first.blob;

  const parts = [first.blob];
  for (let offset = first.blob.size; offset < first.size;) {
    const part = await fetchExportPart(url, offset, first, downloadFailed);
    parts.push(part.blob);
    offset += part.blob.size;
  }
  return new Blob(parts, { type: first.blob.type });
}

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
      const file = await fetchExport(
        `/api/admin/production/sheet/${sheetIndex}?format=${format}&${snapshot}`,
        downloadFailed,
      );
      const url = URL.createObjectURL(file);
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
