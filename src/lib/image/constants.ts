export const STICKER_SIZE_PX = 496;
export const MIN_EDITOR_SCALE = 0.05;
export const MAX_EDITOR_SCALE = 8;
export const STRIPE_SIZE = {
  width: 1120,
  height: 2409,
} as const;
export const SHEET_SIZE = {
  width: 3508,
  height: 2480,
} as const;
export const STICKERS_PER_STRIPE = 8;
export const STRIPES_PER_SHEET = 3;
export const STICKERS_PER_SHEET = STICKERS_PER_STRIPE * STRIPES_PER_SHEET;
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 40_000_000;

export const ACCEPTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
