import "server-only";

import crypto from "crypto";
import path from "path";
import fs from "fs/promises";

import { StickerStatus, type Sticker } from "@prisma/client";
import sharp from "sharp";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_INPUT_PIXELS,
  MAX_UPLOAD_BYTES,
  STICKER_SIZE_PX,
} from "@/lib/image/constants";
import {
  getDefaultEditorState,
  renderAndStoreStickerAssets,
} from "@/lib/image/renderers";
import { getTranslator } from "@/lib/i18n-server";
import { prisma } from "@/lib/prisma";
import {
  STORAGE_DIRS,
  getMimeTypeFromPath,
  readStoredFile,
  writeStoredFile,
  resolveStoragePath,
} from "@/lib/storage";
import { parseEditorState } from "@/lib/validation";
import { constrainState } from "@/lib/image/geometry";
import type { StickerEditorState } from "@/types/stickers";

export function isEditableStickerStatus(status: StickerStatus) {
  return status === StickerStatus.DRAFT || status === StickerStatus.REJECTED;
}

export async function createStickerDraftFromUpload(params: {
  userId: string;
  file: File;
}) {
  const { t } = await getTranslator();

  if (!ACCEPTED_IMAGE_TYPES.has(params.file.type)) {
    throw new Error(t("api.onlyPngJpgWebp"));
  }

  if (params.file.size > MAX_UPLOAD_BYTES) {
    throw new Error(t("api.fileTooLarge"));
  }

  if (params.file.size === 0)
    throw new Error(t("api.imageCouldNotBeProcessed"));
  const uploaded = Buffer.from(await params.file.arrayBuffer());
  const detected = await sharp(uploaded, {
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();
  if (!["png", "jpeg", "webp"].includes(detected.format ?? ""))
    throw new Error(t("api.onlyPngJpgWebp"));
  // Normalize EXIF orientation and colour once, so browser coordinates and Sharp agree.
  const sourceBuffer = await sharp(uploaded, {
    limitInputPixels: MAX_INPUT_PIXELS,
  })
    .rotate()
    .toColourspace("srgb")
    .png()
    .toBuffer();
  const metadata = await sharp(sourceBuffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(t("api.imageCouldNotBeProcessed"));
  }

  const stickerId = crypto.randomUUID();
  const extension = ".png";
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
    mimeType: "image/png",
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

export async function saveStickerStateAndAssets(
  sticker: Sticker,
  editorState: StickerEditorState,
  submit = false,
) {
  const { t } = await getTranslator();
  const parsedState = constrainState(
    parseEditorState(editorState),
    sticker.originalWidth,
    sticker.originalHeight,
  );
  if (!isEditableStickerStatus(sticker.status))
    throw new Error(t("api.stickerNoLongerEditable"));
  const assets = await renderAndStoreStickerAssets({
    stickerId: sticker.id,
    userId: sticker.userId,
    sourceBuffer: await readStoredFile(sticker.originalFilePath),
    mimeType: getMimeTypeFromPath(sticker.originalFilePath),
    originalWidth: sticker.originalWidth,
    originalHeight: sticker.originalHeight,
    state: parsedState,
  });
  const result = await prisma.sticker.updateMany({
    where: {
      id: sticker.id,
      userId: sticker.userId,
      updatedAt: sticker.updatedAt,
      status: { in: [StickerStatus.DRAFT, StickerStatus.REJECTED] },
    },
    data: {
      editorStateJson: parsedState,
      finalFilePath: assets.finalFilePath,
      previewFilePath: assets.previewFilePath,
      status: submit ? StickerStatus.SUBMITTED : StickerStatus.DRAFT,
      rejectReason: null,
      ...(submit ? { submittedAt: new Date() } : {}),
    },
  });
  if (result.count !== 1) {
    await Promise.all(
      [assets.finalFilePath, assets.previewFilePath].map((file) =>
        fs.unlink(resolveStoragePath(file)).catch(() => {}),
      ),
    );
    throw new Error(
      "Макет уже изменён в другой вкладке. Обновите страницу. / Artwork changed; reload this page.",
    );
  }
  await Promise.all(
    [sticker.finalFilePath, sticker.previewFilePath]
      .filter((file): file is string => Boolean(file))
      .map((file) => fs.unlink(resolveStoragePath(file)).catch(() => {})),
  );
  return prisma.sticker.findUniqueOrThrow({ where: { id: sticker.id } });
}
export async function submitSticker(
  sticker: Sticker,
  editorState: StickerEditorState,
) {
  return saveStickerStateAndAssets(sticker, editorState, true);
}

export function getStickerEditorState(sticker: Sticker) {
  return parseEditorState(sticker.editorStateJson);
}
