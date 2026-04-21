import "server-only";

import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const STORAGE_DIRS = {
  originals: "originals",
  finalStickers: "final-stickers",
  previews: "previews",
  generatedStripes: "generated-stripes",
  generatedSheets: "generated-sheets",
  settings: "settings",
} as const;

export type StorageDirectory = (typeof STORAGE_DIRS)[keyof typeof STORAGE_DIRS];

function ensureStorageRoot(absolutePath: string) {
  const normalizedRoot = path.resolve(STORAGE_ROOT);
  const normalizedPath = path.resolve(absolutePath);

  if (normalizedPath !== normalizedRoot && !normalizedPath.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error("Invalid storage path.");
  }

  return normalizedPath;
}

export function resolveStoragePath(relativePath: string) {
  return ensureStorageRoot(path.resolve(STORAGE_ROOT, relativePath));
}

export async function ensureStorageDirectories() {
  await Promise.all(
    Object.values(STORAGE_DIRS).map((directory) =>
      fs.mkdir(path.join(STORAGE_ROOT, directory), { recursive: true }),
    ),
  );
}

export async function writeStoredFile(
  directory: StorageDirectory,
  fileName: string,
  buffer: Buffer,
) {
  await ensureStorageDirectories();

  const relativePath = path.join(directory, fileName);
  const absolutePath = resolveStoragePath(relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return relativePath;
}

export async function readStoredFile(relativePath: string) {
  return fs.readFile(resolveStoragePath(relativePath));
}

export async function fileExists(relativePath: string) {
  try {
    await fs.access(resolveStoragePath(relativePath));
    return true;
  } catch {
    return false;
  }
}

export function buildStorageFileName(prefix: string, extension: string) {
  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return `${prefix}-${crypto.randomUUID()}${normalizedExtension}`;
}

export function buildDeterministicName(prefix: string, seed: string, extension: string) {
  const digest = crypto.createHash("sha256").update(seed).digest("hex").slice(0, 12);
  const normalizedExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return `${prefix}-${digest}${normalizedExtension}`;
}

export function getMimeTypeFromPath(filePath: string) {
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}
