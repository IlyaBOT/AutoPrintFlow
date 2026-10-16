export const runtime = "nodejs";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { renderCutSvg } from "@/lib/production";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stickerId: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN")
    return jsonError("Admin access required", 403);
  const sticker = await prisma.sticker.findUnique({
    where: { id: (await params).stickerId },
  });
  if (!sticker) return jsonError("Sticker not found", 404);
  try {
    return new Response(await renderCutSvg(sticker), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="sticker-${sticker.id}-cut.svg"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Cut export failed", error);
    return jsonError(
      "Не удалось построить контур. / Could not trace artwork.",
      422,
    );
  }
}
