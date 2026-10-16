export const runtime = "nodejs";

import { matchesSheetSnapshot } from "@/lib/queue-snapshot";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { getTranslator } from "@/lib/i18n-server";
import { getOrCreateSheetFile } from "@/lib/image/renderers";
import { getApprovedQueueLayout } from "@/lib/queue-data";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ sheetNumber: string }> },
) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError(t("api.adminAccessRequired"), 403);
  }

  const { sheetNumber } = await context.params;
  const index = Number(sheetNumber);

  if (!Number.isInteger(index) || index < 1) {
    return jsonError(t("api.sheetNumberInvalid"), 422);
  }

  const { sheets } = await getApprovedQueueLayout();
  const sheet = sheets[index - 1];

  if (!sheet) {
    return jsonError(t("api.sheetNotFound"), 404);
  }

  const expectedIds = new URL(request.url).searchParams.get("ids");
  const expectedLayout = new URL(request.url).searchParams.get("layout");
  if (
    (expectedIds || expectedLayout) &&
    (!expectedLayout ||
      !matchesSheetSnapshot(
        sheet,
        (expectedIds ?? "").split(","),
        expectedLayout,
      ))
  )
    return jsonError("Queue changed; reload this page.", 409);
  const filePath = await getOrCreateSheetFile(sheet);
  const buffer = await readStoredFile(filePath);
  const download = new URL(request.url).searchParams.get("download") === "1";

  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="sheet-${sheet.index}.png"`,
    },
  });
}
