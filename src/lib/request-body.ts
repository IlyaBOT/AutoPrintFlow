import { RequestSecurityError } from "./request-security";
export async function readLimitedFormData(request: Request, maxBytes: number) {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes)
    throw new RequestSecurityError("File too large", 413);
  if (!request.body) throw new RequestSecurityError("Missing upload body", 422);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new RequestSecurityError("File too large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Response(body, {
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
  }).formData();
}
