import { jsonError } from "@/lib/http";
import { getSystemSettings } from "@/lib/system-settings";
import { getMimeTypeFromPath, readStoredFile } from "@/lib/storage";

export async function GET(request: Request) {
  const settings = await getSystemSettings();
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const relativePath = kind === "background" ? settings.stripeBackgroundPath : settings.instanceIconFilePath;

  if (!relativePath) {
    return jsonError("Not found", 404);
  }

  const buffer = await readStoredFile(relativePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": getMimeTypeFromPath(relativePath),
      "Cache-Control": "no-store",
    },
  });
}
