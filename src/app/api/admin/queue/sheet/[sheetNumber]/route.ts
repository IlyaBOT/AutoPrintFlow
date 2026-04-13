export const runtime = "nodejs";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { getOrCreateSheetFile } from "@/lib/image/renderers";
import { getApprovedQueueLayout } from "@/lib/queue-data";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ sheetNumber: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError("Admin access required.", 403);
  }

  const { sheetNumber } = await context.params;
  const index = Number(sheetNumber);

  if (!Number.isInteger(index) || index < 1) {
    return jsonError("Sheet number is invalid.", 422);
  }

  const { sheets } = await getApprovedQueueLayout();
  const sheet = sheets[index - 1];

  if (!sheet) {
    return jsonError("Sheet not found.", 404);
  }

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
