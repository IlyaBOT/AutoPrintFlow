import "server-only";

import crypto from "crypto";
import path from "path";

import { StickerStatus, type Sticker } from "@prisma/client";
import sharp from "sharp";

import { ACCEPTED_IMAGE_TYPES, MAX_INPUT_PIXELS, MAX_UPLOAD_BYTES, STICKER_SIZE_PX } from "@/lib/image/constants";
import { getDefaultEditorState, renderAndStoreStickerAssets } from "@/lib/image/renderers";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import { STORAGE_DIRS, getMimeTypeFromPath, readStoredFile, writeStoredFile } from "@/lib/storage";
import { parseEditorState } from "@/lib/validation";
import type { StickerEditorState } from "@/types/stickers";

function getExtensionForMimeType(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  return ".jpg";
}

export function isEditableStickerStatus(status: StickerStatus) {
  return status === StickerStatus.DRAFT || status === StickerStatus.REJECTED;
}

export async function createStickerDraftFromUpload(params: { userId: string; file: File }) {
  const { t } = await getTranslator();

  if (!ACCEPTED_IMAGE_TYPES.has(params.file.type)) {
    throw new Error(t("api.onlyPngJpgWebp"));
  }

  if (params.file.size > MAX_UPLOAD_BYTES) {
    throw new Error(t("api.fileTooLarge"));
  }

  const sourceBuffer = Buffer.from(await params.file.arrayBuffer());
  const metadata = await sharp(sourceBuffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(t("api.imageCouldNotBeProcessed"));
  }

  const stickerId = crypto.randomUUID();
  const extension = getExtensionForMimeType(params.file.type);
  const originalFilePath = await writeStoredFile(
    STORAGE_DIRS.originals,
    path.posix.join(params.userId, `${stickerId}${extension}`),
    sourceBuffer,
  );
  const initialState = getDefaultEditorState(metadata.width, metadata.height);
  const assets = await renderAndStoreStickerAssets({
    stickerId,
    userId: params.userId,
    sourceBuffer,
    mimeType: params.file.type,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
    state: initialState,
  });

  return prisma.sticker.create({
    data: {
      id: stickerId,
      userId: params.userId,
      originalFilePath,
      finalFilePath: assets.finalFilePath,
      previewFilePath: assets.previewFilePath,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      outputWidth: STICKER_SIZE_PX,
      outputHeight: STICKER_SIZE_PX,
      editorStateJson: initialState,
      status: StickerStatus.DRAFT,
    },
  });
}

export async function saveStickerStateAndAssets(sticker: Sticker, editorState: StickerEditorState) {
  const { t } = await getTranslator();
  const parsedState = parseEditorState(editorState);

  if (!isEditableStickerStatus(sticker.status)) {
    throw new Error(t("api.stickerNoLongerEditable"));
  }

  const sourceBuffer = await readStoredFile(sticker.originalFilePath);
  const mimeType = getMimeTypeFromPath(sticker.originalFilePath);
  const assets = await renderAndStoreStickerAssets({
    stickerId: sticker.id,
    userId: sticker.userId,
    sourceBuffer,
    mimeType,
    originalWidth: sticker.originalWidth,
    originalHeight: sticker.originalHeight,
    state: parsedState,
  });

  return prisma.sticker.update({
    where: { id: sticker.id },
    data: {
      editorStateJson: parsedState,
      finalFilePath: assets.finalFilePath,
      previewFilePath: assets.previewFilePath,
      status: sticker.status === StickerStatus.REJECTED ? StickerStatus.DRAFT : sticker.status,
      rejectReason: sticker.status === StickerStatus.REJECTED ? null : sticker.rejectReason,
    },
  });
}

export async function submitSticker(sticker: Sticker, editorState: StickerEditorState) {
  const updated = await saveStickerStateAndAssets(sticker, editorState);

  return prisma.sticker.update({
    where: { id: updated.id },
    data: {
      status: StickerStatus.SUBMITTED,
      submittedAt: new Date(),
      rejectReason: null,
    },
  });
}

export function getStickerEditorState(sticker: Sticker) {
  return parseEditorState(sticker.editorStateJson);
}
