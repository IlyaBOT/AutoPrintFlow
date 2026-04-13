import "server-only";

import path from "path";

import sharp from "sharp";

import { STICKER_SIZE_PX, STRIPE_SIZE, SHEET_SIZE } from "@/lib/image/constants";
import {
  STORAGE_DIRS,
  buildDeterministicName,
  fileExists,
  readStoredFile,
  writeStoredFile,
} from "@/lib/storage";
import type { QueueSheet, QueueStripe, StickerEditorState } from "@/types/stickers";

function formatNumber(value: number) {
  return Number(value.toFixed(4));
}

export function getDefaultEditorState(originalWidth: number, originalHeight: number): StickerEditorState {
  const fitScale = Math.min(STICKER_SIZE_PX / originalWidth, STICKER_SIZE_PX / originalHeight);

  return {
    x: STICKER_SIZE_PX / 2,
    y: STICKER_SIZE_PX / 2,
    scaleX: fitScale,
    scaleY: fitScale,
    rotation: 0,
  };
}

function buildStickerSvg(params: {
  sourceBuffer: Buffer;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  state: StickerEditorState;
}) {
  const sourceData = `data:${params.mimeType};base64,${params.sourceBuffer.toString("base64")}`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${STICKER_SIZE_PX}" height="${STICKER_SIZE_PX}" viewBox="0 0 ${STICKER_SIZE_PX} ${STICKER_SIZE_PX}">
      <defs>
        <clipPath id="clip">
          <rect x="0" y="0" width="${STICKER_SIZE_PX}" height="${STICKER_SIZE_PX}" />
        </clipPath>
      </defs>
      <g clip-path="url(#clip)">
        <g transform="translate(${formatNumber(params.state.x)} ${formatNumber(params.state.y)})">
          <g transform="rotate(${formatNumber(params.state.rotation)})">
            <g transform="scale(${formatNumber(params.state.scaleX)} ${formatNumber(params.state.scaleY)})">
              <image
                href="${sourceData}"
                x="${formatNumber(-params.originalWidth / 2)}"
                y="${formatNumber(-params.originalHeight / 2)}"
                width="${params.originalWidth}"
                height="${params.originalHeight}"
                preserveAspectRatio="none"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  `;
}

export async function renderStickerPng(params: {
  sourceBuffer: Buffer;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  state: StickerEditorState;
}) {
  const svg = buildStickerSvg(params);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function createPreviewPng(finalStickerBuffer: Buffer) {
  return sharp(finalStickerBuffer).resize(320, 320).png().toBuffer();
}

export async function renderAndStoreStickerAssets(params: {
  stickerId: string;
  userId: string;
  sourceBuffer: Buffer;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  state: StickerEditorState;
}) {
  const finalBuffer = await renderStickerPng(params);
  const previewBuffer = await createPreviewPng(finalBuffer);
  const finalFilePath = await writeStoredFile(
    STORAGE_DIRS.finalStickers,
    path.posix.join(params.userId, `${params.stickerId}.png`),
    finalBuffer,
  );
  const previewFilePath = await writeStoredFile(
    STORAGE_DIRS.previews,
    path.posix.join(params.userId, `${params.stickerId}-preview.png`),
    previewBuffer,
  );

  return {
    finalBuffer,
    previewBuffer,
    finalFilePath,
    previewFilePath,
  };
}

function buildStripeBackgroundSvg(occupiedSlots: boolean[]) {
  const cardPositions = [
    { x: 15, y: 18 },
    { x: 535, y: 18 },
    { x: 15, y: 533 },
    { x: 535, y: 533 },
    { x: 15, y: 1048 },
    { x: 535, y: 1048 },
    { x: 15, y: 1563 },
    { x: 535, y: 1563 },
  ];

  const cards = cardPositions
    .map((position, index) => {
      const filled = occupiedSlots[index];
      return `
        <g>
          <rect x="${position.x + 6}" y="${position.y + 10}" width="504" height="504" rx="42" fill="rgba(33, 55, 92, 0.12)" />
          <rect x="${position.x}" y="${position.y}" width="504" height="504" rx="42" fill="${filled ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)"}" stroke="rgba(255,255,255,0.78)" stroke-width="2" />
          ${filled ? "" : `<rect x="${position.x + 140}" y="${position.y + 246}" width="224" height="12" rx="6" fill="rgba(84, 116, 163, 0.18)" />
              <rect x="${position.x + 246}" y="${position.y + 140}" width="12" height="224" rx="6" fill="rgba(84, 116, 163, 0.18)" />`}
        </g>
      `;
    })
    .join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${STRIPE_SIZE.width}" height="${STRIPE_SIZE.height}" viewBox="0 0 ${STRIPE_SIZE.width} ${STRIPE_SIZE.height}">
      <defs>
        <linearGradient id="stripeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d7eaff" />
          <stop offset="45%" stop-color="#b9d8ff" />
          <stop offset="100%" stop-color="#84b7ff" />
        </linearGradient>
        <linearGradient id="footerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#121820" />
          <stop offset="100%" stop-color="#0a0f16" />
        </linearGradient>
      </defs>
      <rect width="${STRIPE_SIZE.width}" height="${STRIPE_SIZE.height}" rx="56" fill="url(#stripeGradient)" />
      <circle cx="160" cy="180" r="220" fill="rgba(255,255,255,0.4)" />
      <circle cx="944" cy="334" r="280" fill="rgba(255,255,255,0.2)" />
      <circle cx="300" cy="2080" r="220" fill="rgba(72, 132, 216, 0.28)" />
      <rect x="20" y="20" width="${STRIPE_SIZE.width - 40}" height="${STRIPE_SIZE.height - 40}" rx="46" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.45)" stroke-width="2" />
      ${cards}
      <rect x="0" y="2087" width="${STRIPE_SIZE.width}" height="142" rx="0" fill="url(#footerGradient)" />
      <rect x="64" y="2144" width="180" height="6" rx="3" fill="rgba(255,255,255,0.5)" />
      <text x="988" y="2158" text-anchor="end" fill="rgba(255,255,255,0.72)" font-size="26" font-family="Manrope, Arial, sans-serif">AutoPrintFlow</text>
    </svg>
  `;
}

const STRIPE_CARD_COORDINATES = [
  { left: 19, top: 22 },
  { left: 539, top: 22 },
  { left: 19, top: 537 },
  { left: 539, top: 537 },
  { left: 19, top: 1052 },
  { left: 539, top: 1052 },
  { left: 19, top: 1567 },
  { left: 539, top: 1567 },
];

export async function renderStripePng(stripe: QueueStripe) {
  const background = sharp(Buffer.from(buildStripeBackgroundSvg(stripe.slots.map(Boolean)))).png();
  const composites: sharp.OverlayOptions[] = [];

  await Promise.all(
    stripe.slots.map(async (slot, index) => {
      if (!slot?.finalFilePath) {
        return;
      }

      const stickerBuffer = await readStoredFile(slot.finalFilePath);
      composites.push({
        input: stickerBuffer,
        left: STRIPE_CARD_COORDINATES[index].left,
        top: STRIPE_CARD_COORDINATES[index].top,
      });
    }),
  );

  return background.composite(composites).png().toBuffer();
}

function buildSheetSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${SHEET_SIZE.width}" height="${SHEET_SIZE.height}" viewBox="0 0 ${SHEET_SIZE.width} ${SHEET_SIZE.height}">
      <defs>
        <linearGradient id="sheetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f3f8ff" />
          <stop offset="55%" stop-color="#d9eaff" />
          <stop offset="100%" stop-color="#c5defd" />
        </linearGradient>
      </defs>
      <rect width="${SHEET_SIZE.width}" height="${SHEET_SIZE.height}" rx="84" fill="url(#sheetGradient)" />
      <circle cx="480" cy="310" r="420" fill="rgba(255,255,255,0.58)" />
      <circle cx="3100" cy="430" r="500" fill="rgba(255,255,255,0.26)" />
      <circle cx="1780" cy="2140" r="380" fill="rgba(90, 146, 226, 0.18)" />
      <rect x="40" y="40" width="${SHEET_SIZE.width - 80}" height="${SHEET_SIZE.height - 80}" rx="68" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.52)" stroke-width="2" />
    </svg>
  `;
}

const SHEET_STRIPE_POSITIONS = [
  { left: 130, top: 125 },
  { left: 1227, top: 125 },
  { left: 2324, top: 125 },
];

export async function renderSheetPng(sheet: QueueSheet) {
  const base = sharp(Buffer.from(buildSheetSvg())).png();
  const composites: sharp.OverlayOptions[] = [];

  for (let index = 0; index < 3; index += 1) {
    const stripe = sheet.stripes[index] ?? {
      index: 0,
      sheetIndex: sheet.index,
      positionInSheet: index,
      stickers: [],
      slots: Array.from({ length: 8 }, () => null),
      stickerCount: 0,
    };
    const stripeBuffer = await renderStripePng(stripe);
    composites.push({
      input: stripeBuffer,
      left: SHEET_STRIPE_POSITIONS[index].left,
      top: SHEET_STRIPE_POSITIONS[index].top,
    });
  }

  return base.composite(composites).png().toBuffer();
}

function getStripeSeed(stripe: QueueStripe) {
  return stripe.slots.map((slot) => slot?.id ?? "empty").join("-");
}

function getSheetSeed(sheet: QueueSheet) {
  return sheet.stripes.map((stripe) => getStripeSeed(stripe)).join("|");
}

export async function getOrCreateStripeFile(stripe: QueueStripe) {
  const fileName = buildDeterministicName(`stripe-${stripe.index}`, getStripeSeed(stripe), ".png");
  const relativePath = path.posix.join(fileName);

  if (!(await fileExists(path.posix.join(STORAGE_DIRS.generatedStripes, relativePath)))) {
    const buffer = await renderStripePng(stripe);
    await writeStoredFile(STORAGE_DIRS.generatedStripes, relativePath, buffer);
  }

  return path.posix.join(STORAGE_DIRS.generatedStripes, relativePath);
}

export async function getOrCreateSheetFile(sheet: QueueSheet) {
  const fileName = buildDeterministicName(`sheet-${sheet.index}`, getSheetSeed(sheet), ".png");
  const relativePath = path.posix.join(fileName);

  if (!(await fileExists(path.posix.join(STORAGE_DIRS.generatedSheets, relativePath)))) {
    const buffer = await renderSheetPng(sheet);
    await writeStoredFile(STORAGE_DIRS.generatedSheets, relativePath, buffer);
  }

  return path.posix.join(STORAGE_DIRS.generatedSheets, relativePath);
}
