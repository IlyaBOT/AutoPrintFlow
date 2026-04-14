import "server-only";

import path from "path";

import sharp from "sharp";

import { STICKER_SIZE_PX, STRIPE_SIZE, SHEET_SIZE } from "@/lib/image/constants";
import { convertPtToPx, getSystemSettings, resolveStripeFooterText } from "@/lib/system-settings";
import {
  STORAGE_DIRS,
  buildDeterministicName,
  fileExists,
  readStoredFile,
  writeStoredFile,
} from "@/lib/storage";
import type { QueueSheet, QueueStripe, StickerEditorState } from "@/types/stickers";

const RENDER_VERSION = "settings-v1";

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

const STRIPE_CARD_SIZE = 520;
const STRIPE_CARD_RADIUS = 34;
const STRIPE_CARD_GAP_X = 40;
const STRIPE_CARD_GAP_Y = 56;
const STRIPE_CARD_MARGIN_X = 20;
const STRIPE_CARD_MARGIN_Y = 18;
const STRIPE_CARD_SHADOW_OFFSET = { x: 6, y: 10 };
const STRIPE_STICKER_INSET = Math.round((STRIPE_CARD_SIZE - STICKER_SIZE_PX) / 2);
const STRIPE_FOOTER_HEIGHT = 110;
const STRIPE_HORIZON_Y = 1270;

const STRIPE_CARD_POSITIONS = Array.from({ length: 4 }, (_, row) =>
  Array.from({ length: 2 }, (_, col) => ({
    x: STRIPE_CARD_MARGIN_X + col * (STRIPE_CARD_SIZE + STRIPE_CARD_GAP_X),
    y: STRIPE_CARD_MARGIN_Y + row * (STRIPE_CARD_SIZE + STRIPE_CARD_GAP_Y),
  })),
).flat();

function buildDefaultStripeBackgroundSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${STRIPE_SIZE.width}" height="${STRIPE_SIZE.height}" viewBox="0 0 ${STRIPE_SIZE.width} ${STRIPE_SIZE.height}">
      <defs>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3b63b5" />
          <stop offset="60%" stop-color="#7aa0dd" />
          <stop offset="100%" stop-color="#9cb8e6" />
        </linearGradient>
        <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#7a934f" />
          <stop offset="45%" stop-color="#4f6d35" />
          <stop offset="100%" stop-color="#2f4a1c" />
        </linearGradient>
      </defs>
      <rect width="${STRIPE_SIZE.width}" height="${STRIPE_SIZE.height}" fill="url(#skyGradient)" />
      <rect y="${STRIPE_HORIZON_Y}" width="${STRIPE_SIZE.width}" height="${STRIPE_SIZE.height - STRIPE_HORIZON_Y}" fill="url(#grassGradient)" />
      <rect y="${STRIPE_HORIZON_Y - 90}" width="${STRIPE_SIZE.width}" height="180" fill="rgba(255,255,255,0.12)" />
      <circle cx="180" cy="180" r="120" fill="rgba(255,255,255,0.45)" />
      <circle cx="300" cy="240" r="90" fill="rgba(255,255,255,0.35)" />
      <circle cx="860" cy="180" r="140" fill="rgba(255,255,255,0.28)" />
      <circle cx="980" cy="260" r="110" fill="rgba(255,255,255,0.22)" />
    </svg>
  `;
}

function buildStripeOverlaySvg(params: {
  occupiedSlots: boolean[];
  footerText: string;
  footerFontSizePt: number;
}) {
  const emptySlotIcon = (position: { x: number; y: number }) => `
    <g transform="translate(${position.x + 154} ${position.y + 154})">
      <rect x="0" y="0" width="212" height="212" rx="28" fill="#b9bcc3" />
      <g transform="translate(46 46)" stroke="#000000" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <rect x="6" y="16" width="108" height="88" rx="14" />
        <circle cx="40" cy="42" r="9" fill="#000000" stroke="none" />
        <path d="M20 86l22-22a6 6 0 0 1 8 0l18 18" />
        <path d="M64 82l10-10a6 6 0 0 1 8 0l18 18" />
        <path d="M8 8l104 104" />
      </g>
    </g>
  `;

  const cards = STRIPE_CARD_POSITIONS
    .map((position, index) => {
      const filled = params.occupiedSlots[index];
      const fill = filled ? "rgba(255,255,255,0.98)" : "#b9bcc3";
      return `
        <g>
          <rect x="${position.x + STRIPE_CARD_SHADOW_OFFSET.x}" y="${position.y + STRIPE_CARD_SHADOW_OFFSET.y}" width="${STRIPE_CARD_SIZE}" height="${STRIPE_CARD_SIZE}" rx="${STRIPE_CARD_RADIUS}" fill="rgba(8, 14, 24, 0.18)" />
          <rect x="${position.x}" y="${position.y}" width="${STRIPE_CARD_SIZE}" height="${STRIPE_CARD_SIZE}" rx="${STRIPE_CARD_RADIUS}" fill="${fill}" stroke="rgba(255,255,255,0.88)" stroke-width="2" />
          ${filled ? "" : emptySlotIcon(position)}
        </g>
      `;
    })
    .join("");

  const footerTop = STRIPE_SIZE.height - STRIPE_FOOTER_HEIGHT;
  const footerFontSizePx = convertPtToPx(params.footerFontSizePt);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${STRIPE_SIZE.width}" height="${STRIPE_SIZE.height}" viewBox="0 0 ${STRIPE_SIZE.width} ${STRIPE_SIZE.height}">
      ${cards}
      <rect x="0" y="${footerTop}" width="${STRIPE_SIZE.width}" height="${STRIPE_FOOTER_HEIGHT}" fill="#0a0a0a" />
      <rect x="0" y="${footerTop}" width="${STRIPE_SIZE.width}" height="6" fill="rgba(255,255,255,0.08)" />
      <text x="${STRIPE_SIZE.width / 2}" y="${footerTop + Math.round(STRIPE_FOOTER_HEIGHT * 0.68)}" text-anchor="middle" fill="rgba(255,255,255,0.94)" font-size="${footerFontSizePx}" font-family="Myriad Pro, Liberation Sans, DejaVu Sans, Arial, sans-serif" font-weight="700">${params.footerText}</text>
    </svg>
  `;
}

const STRIPE_CARD_COORDINATES = STRIPE_CARD_POSITIONS.map((position) => ({
  left: position.x + STRIPE_STICKER_INSET,
  top: position.y + STRIPE_STICKER_INSET,
}));

export async function renderStripePng(stripe: QueueStripe) {
  const settings = await getSystemSettings();
  const footerText = resolveStripeFooterText(settings.stripeFooterText);
  const base =
    settings.stripeBackgroundPath
      ? sharp(await readStoredFile(settings.stripeBackgroundPath)).resize(STRIPE_SIZE.width, STRIPE_SIZE.height, {
          fit: "cover",
        })
      : sharp(Buffer.from(buildDefaultStripeBackgroundSvg()));
  const background = base
    .composite([
      {
        input: Buffer.from(
          buildStripeOverlaySvg({
            occupiedSlots: stripe.slots.map(Boolean),
            footerText,
            footerFontSizePt: settings.stripeFooterFontSizePt,
          }),
        ),
      },
    ])
    .png();
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
      <rect width="${SHEET_SIZE.width}" height="${SHEET_SIZE.height}" fill="#ffffff" />
      <rect x="18" y="18" width="${SHEET_SIZE.width - 36}" height="${SHEET_SIZE.height - 36}" rx="36" fill="none" stroke="rgba(15, 23, 42, 0.08)" stroke-width="2" />
    </svg>
  `;
}

const SHEET_STRIPE_POSITIONS = [
  { left: 37, top: 37 },
  { left: 1194, top: 37 },
  { left: 2351, top: 37 },
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

async function getStripeSeed(stripe: QueueStripe) {
  const settings = await getSystemSettings();
  return [
    RENDER_VERSION,
    stripe.slots.map((slot) => slot?.id ?? "empty").join("-"),
    settings.stripeBackgroundPath ?? "default-bg",
    settings.stripeFooterText,
    String(settings.stripeFooterFontSizePt),
    settings.updatedAt.toISOString(),
  ].join("|");
}

async function getSheetSeed(sheet: QueueSheet) {
  const stripeSeeds = await Promise.all(sheet.stripes.map((stripe) => getStripeSeed(stripe)));
  return [RENDER_VERSION, stripeSeeds.join("|")].join("|");
}

export async function getOrCreateStripeFile(stripe: QueueStripe) {
  const fileName = buildDeterministicName(`stripe-${stripe.index}`, await getStripeSeed(stripe), ".png");
  const relativePath = path.posix.join(fileName);

  if (!(await fileExists(path.posix.join(STORAGE_DIRS.generatedStripes, relativePath)))) {
    const buffer = await renderStripePng(stripe);
    await writeStoredFile(STORAGE_DIRS.generatedStripes, relativePath, buffer);
  }

  return path.posix.join(STORAGE_DIRS.generatedStripes, relativePath);
}

export async function getOrCreateSheetFile(sheet: QueueSheet) {
  const fileName = buildDeterministicName(`sheet-${sheet.index}`, await getSheetSeed(sheet), ".png");
  const relativePath = path.posix.join(fileName);

  if (!(await fileExists(path.posix.join(STORAGE_DIRS.generatedSheets, relativePath)))) {
    const buffer = await renderSheetPng(sheet);
    await writeStoredFile(STORAGE_DIRS.generatedSheets, relativePath, buffer);
  }

  return path.posix.join(STORAGE_DIRS.generatedSheets, relativePath);
}
