import sharp from "sharp";
import { PRINT_DPI, STICKER_SIZE_PX, mmToPx } from "./constants";
import { constrainState, getCrop, getCutGeometry } from "./geometry";
import { contourPath, dilateMask, traceExternalContours } from "./contours";
import type { StickerEditorState } from "@/types/stickers";

export type ArtworkParams = {
  sourceBuffer: Buffer;
  mimeType: string;
  originalWidth: number;
  originalHeight: number;
  state: StickerEditorState;
};
export async function renderArtwork(params: ArtworkParams) {
  const state = constrainState(
    params.state,
    params.originalWidth,
    params.originalHeight,
  );
  const crop = getCrop(state, params.originalWidth, params.originalHeight);
  const image = `data:${params.mimeType};base64,${params.sourceBuffer.toString("base64")}`;
  // Crop in source coordinates, then transform the cropped rectangle around its centre.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="496" height="496" viewBox="0 0 496 496"><g transform="translate(${state.x} ${state.y}) rotate(${state.rotation}) scale(${state.scaleX * (state.flipX ? -1 : 1)} ${state.scaleY * (state.flipY ? -1 : 1)})"><svg x="${-crop.width / 2}" y="${-crop.height / 2}" width="${crop.width}" height="${crop.height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" overflow="hidden"><image href="${image}" width="${params.originalWidth}" height="${params.originalHeight}"/></svg></g></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
export async function buildCutPath(params: ArtworkParams) {
  const geometry = getCutGeometry(params.state);
  const { inset: i, size: s, radius: r } = geometry;
  if (params.state.cutShape !== "contour") {
    return {
      path: `M${i + r} ${i} H${i + s - r} Q${i + s} ${i} ${i + s} ${i + r} V${i + s - r} Q${i + s} ${i + s} ${i + s - r} ${i + s} H${i + r} Q${i} ${i + s} ${i} ${i + s - r} V${i + r} Q${i} ${i} ${i + r} ${i} Z`,
      geometry,
    };
  }
  const { data, info } = await sharp(await renderArtwork(params))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = Uint8Array.from(
    { length: info.width * info.height },
    (_, index) => (data[index * 4 + 3] >= 32 ? 1 : 0),
  );
  const mask = dilateMask(
    alpha,
    info.width,
    info.height,
    mmToPx(params.state.borderMm ?? 2),
  );
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      if (x < i || y < i || x + 1 > i + s || y + 1 > i + s)
        mask[y * info.width + x] = 0;
    }
  const contours = traceExternalContours(mask, info.width, info.height);
  if (!contours.length)
    throw new Error(
      "No printable contour found. Use an image with visible, opaque artwork.",
    );
  return { path: contourPath(contours), geometry };
}
export async function renderProductionSticker(params: ArtworkParams) {
  const artwork = await renderArtwork(params);
  const cut = await buildCutPath(params);
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="496" height="496"><path d="${cut.path}" fill="white"/></svg>`;
  return sharp({
    create: {
      width: STICKER_SIZE_PX,
      height: STICKER_SIZE_PX,
      channels: 4,
      background: "white",
    },
  })
    .composite([
      { input: artwork },
      { input: Buffer.from(mask), blend: "dest-in" },
    ])
    .withMetadata({ density: PRINT_DPI })
    .png()
    .toBuffer();
}
