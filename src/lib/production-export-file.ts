import "server-only";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, open, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const cacheLifetimeMs = 5 * 60_000;
const cacheLimit = 4;

type ExportFile = {
  path: string;
  size: number;
  etag: string;
};
type CachedExport = {
  directory: string;
  file: ExportFile;
  expiry: NodeJS.Timeout;
};
const cache = new Map<string, CachedExport>();

function removeDirectory(directory: string) {
  return rm(directory, { recursive: true, force: true }).catch((error) => {
    console.error("Production export cleanup failed", error);
  });
}

function evict(key: string, entry: CachedExport) {
  clearTimeout(entry.expiry);
  cache.delete(key);
  void removeDirectory(entry.directory);
}

function cacheExport(key: string, directory: string, file: ExportFile) {
  const entry: CachedExport = {
    directory,
    file,
    expiry: setTimeout(() => evict(key, entry), cacheLifetimeMs).unref(),
  };
  cache.set(key, entry);
}

export function findExportFile(key: string) {
  const entry = cache.get(key);
  if (!entry) return;
  entry.expiry.refresh();
  cache.delete(key);
  cache.set(key, entry);
  return entry.file;
}

export async function prepareExportFile(
  key: string,
  exportChunks: () => Promise<Iterable<Uint8Array>>,
) {
  const chunks = await exportChunks();
  const directory = await mkdtemp(join(tmpdir(), "autoprintflow-export-"));
  try {
    const path = join(directory, "export");
    await pipeline(
      Readable.from(chunks),
      createWriteStream(path, { mode: 0o600 }),
    );
    const file = {
      path,
      size: (await stat(path)).size,
      etag: `"${randomUUID()}"`,
    };
    cacheExport(key, directory, file);
    if (cache.size > cacheLimit) {
      const [oldestKey, oldestEntry] = cache.entries().next().value!;
      evict(oldestKey, oldestEntry);
    }
    return file;
  } catch (error) {
    await removeDirectory(directory);
    throw error;
  }
}

function parseRange(range: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(range);
  if (!match || (!match[1] && !match[2])) return null;
  const last = size - 1;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), last) : last;
  return start <= end ? { start, end } : null;
}

export async function serveExportFile(
  file: ExportFile,
  range: string | null,
  headers: Headers,
) {
  headers.set("Accept-Ranges", "bytes");
  headers.set("ETag", file.etag);
  const part =
    range === null
      ? { start: 0, end: file.size - 1 }
      : parseRange(range, file.size);
  if (!part) {
    headers.set("Content-Range", `bytes */${file.size}`);
    return new Response(null, { status: 416, headers });
  }

  const { start, end } = part;
  headers.set("Content-Length", String(end - start + 1));
  if (range !== null) {
    headers.set("Content-Range", `bytes ${start}-${end}/${file.size}`);
  }
  const handle = await open(file.path, "r");
  const body = Readable.toWeb(handle.createReadStream({ start, end }), {
    strategy: {
      highWaterMark: 64 * 1024,
      size: (chunk: Uint8Array) => chunk.byteLength,
    },
  }) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range === null ? 200 : 206, headers });
}
