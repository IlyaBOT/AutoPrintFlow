export const runtime = "nodejs";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { getApprovedQueueLayout } from "@/lib/queue-data";
import { matchesSheetSnapshot } from "@/lib/queue-snapshot";
import { renderProductionSheet, sheetExportChunks } from "@/lib/production";
import {
  findExportFile,
  prepareExportFile,
  serveExportFile,
} from "@/lib/production-export-file";
import { enforceRateLimit, RequestSecurityError } from "@/lib/request-security";
import { getSystemSettings } from "@/lib/system-settings";

let preparation:
  { key: string; file: ReturnType<typeof prepareExportFile> } | undefined;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sheetNumber: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return jsonError("Admin access required", 403);
  const index = Number((await params).sheetNumber);
  if (!Number.isSafeInteger(index) || index < 1)
    return jsonError("Invalid sheet number", 422);
  const url = new URL(request.url),
    format = url.searchParams.get("format") ?? "zip";
  if (!["psd", "zip"].includes(format))
    return jsonError("Unsupported format", 422);
  const sheet = (await getApprovedQueueLayout()).sheets[index - 1];
  if (!sheet) return jsonError("Sheet not found", 404);
  const ids = url.searchParams.get("ids")?.split(",") ?? [];
  const expectedLayout = url.searchParams.get("layout");
  if (!expectedLayout || !matchesSheetSnapshot(sheet, ids, expectedLayout))
    return jsonError(
      "Очередь изменилась. Обновите страницу перед экспортом. / Queue changed; reload this page.",
      409,
    );
  try {
    const settings = await getSystemSettings();
    const key = JSON.stringify([
      index,
      format,
      expectedLayout,
      settings.updatedAt,
      new Date().getFullYear(),
      sheet.stripes.map(({ label, customerId }) => [label, customerId]),
    ]);
    let file = findExportFile(key);
    const ifMatch = request.headers.get("If-Match");
    if (
      ifMatch &&
      ifMatch !== "*" &&
      !ifMatch.split(",").some((tag) => tag.trim() === file?.etag)
    ) {
      return jsonError(
        "Экспорт изменился. Запустите скачивание заново. / The export changed. Start the download again.",
        412,
      );
    }
    if (!file) {
      if (preparation && preparation.key !== key)
        return Response.json(
          {
            error:
              "Другой экспорт уже выполняется. Повторите через несколько секунд. / Another export is running; retry shortly.",
          },
          { status: 429, headers: { "Retry-After": "3" } },
        );
      preparation ??= {
        key,
        file: prepareExportFile(key, async () => {
          await enforceRateLimit({
            key: `production:${user.id}`,
            limit: 12,
            windowMs: 60_000,
            errorMessage: "Слишком много экспортов. Повторите через минуту.",
          });
          const result = await renderProductionSheet(sheet, format === "zip");
          return sheetExportChunks(result);
        }).finally(() => {
          preparation = undefined;
        }),
      };
      file = await preparation.file;
    }
    if (request.signal.aborted) return new Response(null, { status: 499 });
    return await serveExportFile(
      file,
      request.headers.get("Range"),
      new Headers({
        "Content-Type":
          format === "psd" ? "image/vnd.adobe.photoshop" : "application/zip",
        "Content-Disposition": `attachment; filename="sheet-${index}.${format}"`,
        "Cache-Control": "private, no-store, no-transform",
        "X-Accel-Buffering": "no",
      }),
    );
  } catch (error) {
    console.error("Production export failed", error);
    return jsonError(
      error instanceof RequestSecurityError
        ? error.message
        : "Не удалось собрать экспорт. Проверьте исходники стикеров. / Export failed; check source assets.",
      error instanceof RequestSecurityError ? error.status : 500,
    );
  }
}
