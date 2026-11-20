import "server-only";
import { Zip, ZipDeflate, ZipPassThrough, strToU8 } from "fflate";
import sharp from "sharp";
import { buildCutPath } from "@/lib/image/artwork";
import {
  MACHINE_SIZE_MM,
  PRINT_DPI,
  SHEET_SIZE,
  STICKER_SIZE_MM,
  STICKER_SIZE_PX,
} from "@/lib/image/constants";
import {
  renderSheetPng,
  renderStickerPng,
  SHEET_STRIPE_POSITIONS,
  STRIPE_CARD_COORDINATES,
} from "@/lib/image/renderers";
import { writeLayeredPsd } from "@/lib/image/psd";
import { getMimeTypeFromPath, readStoredFile } from "@/lib/storage";
import { parseEditorState } from "@/lib/validation";
import type { QueueSheet, QueueStickerSummary } from "@/types/stickers";

type ArchiveFiles = Record<string, Uint8Array>;
type SheetExport = { psd: Buffer } | { files: ArchiveFiles };

export async function getProductionArtwork(sticker: QueueStickerSummary) {
  if (
    !sticker.originalFilePath ||
    !sticker.originalWidth ||
    !sticker.originalHeight
  )
    throw new Error(`Missing source for sticker ${sticker.id}`);
  return {
    sourceBuffer: await readStoredFile(sticker.originalFilePath),
    mimeType: getMimeTypeFromPath(sticker.originalFilePath),
    originalWidth: sticker.originalWidth,
    originalHeight: sticker.originalHeight,
    state: parseEditorState(sticker.editorStateJson),
  };
}
export async function renderCutSvg(sticker: QueueStickerSummary) {
  const artwork = await getProductionArtwork(sticker);
  return formatCutSvg(sticker.id, await buildCutPath(artwork));
}

function formatCutSvg(
  stickerId: string,
  cut: Awaited<ReturnType<typeof buildCutPath>>,
) {
  const origin = (MACHINE_SIZE_MM - STICKER_SIZE_MM) / 2;
  // One sticker per file. No frame/registration paths that could accidentally be cut.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80mm" height="80mm" viewBox="0 0 80 80"><title>Sticker ${stickerId} — ${cut.geometry.sizeMm} mm — origin ${origin},${origin} mm</title><g transform="translate(${origin} ${origin}) scale(${STICKER_SIZE_MM / STICKER_SIZE_PX})" fill="none" stroke="#ff0000" stroke-width="0.25"><path d="${cut.path}"/></g></svg>`;
}
export async function renderProductionSheet(
  sheet: QueueSheet,
  bundle: boolean,
): Promise<SheetExport> {
  const layers: Array<{
    name: string;
    png: Buffer;
    left: number;
    top: number;
  }> = [];
  const files: ArchiveFiles = {};
  const placements: Array<Record<string, unknown>> = [];
  let number = 0;
  for (const stripe of sheet.stripes) {
    for (let slotIndex = 0; slotIndex < stripe.slots.length; slotIndex++) {
      const sticker = stripe.slots[slotIndex];
      if (!sticker) continue;
      const artwork = await getProductionArtwork(sticker);
      const png = sticker.finalFilePath
        ? await readStoredFile(sticker.finalFilePath)
        : await renderStickerPng(artwork);
      const stripePosition = SHEET_STRIPE_POSITIONS[stripe.positionInSheet];
      const position = STRIPE_CARD_COORDINATES[slotIndex];
      const name = `${String(++number).padStart(2, "0")}-${sticker.id}`;
      const left = stripePosition.left + position.left,
        top = stripePosition.top + position.top;
      layers.push({ name, png, left, top });
      if (bundle) {
        files[`cuts/${name}.svg`] = strToU8(
          formatCutSvg(sticker.id, await buildCutPath(artwork)),
        );
        files[`stickers/${name}.png`] = png;
      }
      placements.push({
        number,
        stickerId: sticker.id,
        updatedAt: sticker.updatedAt?.toISOString(),
        stripe: stripe.index,
        stripeId: stripe.id,
        shipmentLabel: stripe.label ?? null,
        customerId: stripe.customerId ?? null,
        slot: slotIndex + 1,
        sheetPixels: { left, top },
        sheetMm: { left: (left * 25.4) / 300, top: (top * 25.4) / 300 },
        templateMm: 42,
        cutSizeMm: artwork.state.cutSizeMm ?? 42,
        cutShape: artwork.state.cutShape ?? "rounded",
        borderMm: artwork.state.borderMm ?? 2,
        svgTemplateOriginMm: { x: 19, y: 19 },
      });
    }
  }
  const background = await renderSheetPng(sheet, false);
  const composite = await sharp(background)
    .composite(
      layers.map(({ png: input, left, top }) => ({ input, left, top })),
    )
    .withMetadata({ density: PRINT_DPI })
    .png()
    .toBuffer();
  const psd = await writeLayeredPsd({
    ...SHEET_SIZE,
    composite,
    background,
    layers,
  });
  if (!bundle) return { psd };
  files[`sheet-${sheet.index}.psd`] = psd;
  files[`sheet-${sheet.index}.png`] = composite;
  files["placements.json"] = strToU8(
    JSON.stringify(
      {
        sheet: sheet.index,
        dpi: 300,
        machineMm: { width: 80, height: 80 },
        placements,
      },
      null,
      2,
    ),
  );
  files["READ-ME.txt"] = strToU8(
    "AutoPrintFlow production package\n\nPrint the sheet PNG/PSD at 100% and 300 DPI. Each PSD sticker is a separate raster layer.\nImport ONE file from cuts/ at a time into LightBurn. SVG document: 80 x 80 mm. The 42 mm template starts at X=19, Y=19 mm. No laser power/speed or device commands are embedded.\nPosition each printed sticker under the machine separately using a physical jig. Sheet offsets in placements.json identify its original location; they are NOT machine travel commands. Use Frame and verify alignment before cutting.\nContours follow alpha transparency, with an outward white margin clipped to the template. Separate opaque islands produce separate cuts. Inner holes are not cut. Photo backgrounds must be removed before upload.\nThe original Photoshop template is not included in this repository; PSD placement follows the existing application layout.\n",
  );
  return { files };
}

function* zipChunks(files: ArchiveFiles) {
  const chunkSize = 1024 * 1024;
  const chunks: Uint8Array[] = [];
  const archive = new Zip((error, chunk) => {
    if (error) throw error;
    chunks.push(chunk);
  });

  try {
    for (const [name, bytes] of Object.entries(files)) {
      const file = name.endsWith(".png")
        ? new ZipPassThrough(name)
        : new ZipDeflate(name, { level: 1 });
      archive.add(file);

      let offset = 0;
      do {
        const end = Math.min(offset + chunkSize, bytes.length);
        file.push(bytes.subarray(offset, end), end === bytes.length);
        yield* chunks.splice(0);
        offset = end;
      } while (offset < bytes.length);
    }
    archive.end();
    yield* chunks;
  } finally {
    archive.terminate();
  }
}

export function streamSheetExport(result: SheetExport, onClose: () => void) {
  const chunks =
    "files" in result ? zipChunks(result.files) : [result.psd].values();

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      try {
        const chunk = chunks.next();
        if (chunk.done) {
          controller.close();
          onClose();
        } else {
          controller.enqueue(chunk.value);
        }
      } catch (error) {
        onClose();
        console.error("Production download failed", error);
        controller.error(error);
      }
    },
    cancel() {
      try {
        chunks.return?.(undefined);
      } finally {
        onClose();
      }
    },
  });
}
