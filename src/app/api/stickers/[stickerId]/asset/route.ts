export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { getMimeTypeFromPath, readStoredFile } from "@/lib/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ stickerId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Authentication required.", 401);
  }

  const { stickerId } = await context.params;
  const sticker = await prisma.sticker.findFirst({
    where: {
      id: stickerId,
      ...(user.role === "ADMIN" ? {} : { userId: user.id }),
    },
    select: {
      id: true,
      userId: true,
      originalFilePath: true,
      previewFilePath: true,
      finalFilePath: true,
    },
  });

  if (!sticker) {
    return jsonError("Sticker not found.", 404);
  }

  const url = new URL(request.url);
  const variant = url.searchParams.get("variant") ?? "final";
  const download = url.searchParams.get("download") === "1";
  const selectedPath =
    variant === "original"
      ? sticker.originalFilePath
      : variant === "preview"
        ? sticker.previewFilePath
        : sticker.finalFilePath;

  if (!selectedPath) {
    return jsonError("Requested asset is not available.", 404);
  }

  const buffer = await readStoredFile(selectedPath);
  const fileName = variant === "preview" ? `sticker-${sticker.id}-preview.png` : `sticker-${sticker.id}.png`;

  return new Response(buffer, {
    headers: {
      "Content-Type": getMimeTypeFromPath(selectedPath),
      "Cache-Control": "no-store",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
    },
  });
}
