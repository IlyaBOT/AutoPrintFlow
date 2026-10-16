import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { initializeCanvas, readPsd } from "ag-psd";
import {
  constrainState,
  fitState,
  transformedBounds,
  getCrop,
} from "../src/lib/image/geometry";
import { editorStateSchema } from "../src/lib/validation";
import {
  dilateMask,
  traceExternalContours,
  contourPath,
} from "../src/lib/image/contours";
import {
  buildCutPath,
  renderArtwork,
  renderProductionSticker,
} from "../src/lib/image/artwork";
import { writeLayeredPsd } from "../src/lib/image/psd";
import { buildQueueLayout } from "../src/lib/queue";
import { matchesSheetSnapshot } from "../src/lib/queue-snapshot";
import type { StickerEditorState } from "../src/types/stickers";
const state: StickerEditorState = {
  x: 248,
  y: 248,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  cutShape: "rounded",
  cutSizeMm: 42,
  borderMm: 2,
};

test("all transforms keep the rotated crop inside the 496 px template", () => {
  for (const [width, height] of [
    [6000, 4000],
    [1, 1],
    [64, 512],
    [40000, 1000],
  ])
    for (const rotation of [-180, -95, -45, 0, 34, 90, 180]) {
      const next = constrainState(
        {
          ...state,
          x: -100,
          y: 900,
          scaleX: 8,
          scaleY: 3,
          rotation,
          crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
        },
        width,
        height,
      );
      const bounds = transformedBounds(next, width, height);
      assert.ok(
        next.x - bounds.width / 2 >= -1e-7 &&
          next.x + bounds.width / 2 <= 496 + 1e-7,
      );
      assert.ok(
        next.y - bounds.height / 2 >= -1e-7 &&
          next.y + bounds.height / 2 <= 496 + 1e-7,
      );
    }
});
test("large images fit without the old 0.05 scale floor", () => {
  const next = fitState(state, 10000, 3000);
  assert.ok(next.scaleX < 0.05);
  assert.equal(
    getCrop(
      { ...state, crop: { x: 0.25, y: 0, width: 0.5, height: 1 } },
      100,
      50,
    ).width,
    50,
  );
});
test("validation rejects nonfinite transforms, source overflow and invalid cutting sizes", () => {
  for (const patch of [
    { rotation: Infinity },
    { scaleX: NaN },
    { cutSizeMm: 81 },
    { borderMm: -1 },
    { crop: { x: 0.9, y: 0, width: 0.5, height: 1 } },
  ])
    assert.equal(
      editorStateSchema.safeParse({ ...state, ...patch }).success,
      false,
    );
  assert.equal(
    editorStateSchema.safeParse({
      x: 248,
      y: 248,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    }).success,
    true,
  );
});
test("Euclidean dilation matches brute force including an empty mask", () => {
  for (const positions of [[], [12], [1, 23]]) {
    const mask = new Uint8Array(25);
    for (const i of positions) mask[i] = 1;
    const result = dilateMask(mask, 5, 5, 1.5);
    for (let i = 0; i < 25; i++)
      assert.equal(
        result[i],
        positions.some(
          (p) =>
            ((p % 5) - (i % 5)) ** 2 +
              (Math.floor(p / 5) - Math.floor(i / 5)) ** 2 <=
            2.25,
        )
          ? 1
          : 0,
      );
  }
});
test("tracer returns closed exterior loops and excludes internal holes", () => {
  const mask = new Uint8Array(100);
  for (let y = 1; y < 9; y++) for (let x = 1; x < 9; x++) mask[y * 10 + x] = 1;
  for (let y = 3; y < 7; y++) for (let x = 3; x < 7; x++) mask[y * 10 + x] = 0;
  const contours = traceExternalContours(mask, 10, 10);
  assert.equal(contours.length, 1);
  assert.equal(contours[0].length, 4);
  assert.ok(contourPath(contours).endsWith("Z"));
});
test("tracer keeps separate islands and ignores tiny noise", () => {
  const mask = new Uint8Array(300);
  for (const left of [1, 11])
    for (let y = 2; y < 8; y++)
      for (let x = left; x < left + 6; x++) mask[y * 20 + x] = 1;
  mask[299] = 1;
  assert.equal(traceExternalContours(mask, 20, 15).length, 2);
});
async function fixture() {
  const png = await sharp(
    Buffer.from(
      '<svg width="200" height="100"><rect width="100" height="100" fill="red"/><rect x="100" width="100" height="100" fill="blue"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  return {
    sourceBuffer: png,
    mimeType: "image/png",
    originalWidth: 200,
    originalHeight: 100,
    state,
  };
}
test("crop selects source pixels and flip reverses the visible artwork", async () => {
  const params = await fixture();
  const cropped = await renderArtwork({
    ...params,
    state: {
      ...state,
      crop: { x: 0.5, y: 0, width: 0.5, height: 1 },
      scaleX: 2,
      scaleY: 2,
    },
  });
  const sample = await sharp(cropped)
    .extract({ left: 248, top: 248, width: 1, height: 1 })
    .raw()
    .toBuffer();
  assert.equal(sample[2], 255);
  assert.equal(sample[0], 0);
  const flipped = await renderArtwork({
    ...params,
    state: { ...state, flipX: true },
  });
  const pixel = await sharp(flipped)
    .extract({ left: 210, top: 248, width: 1, height: 1 })
    .raw()
    .toBuffer();
  assert.equal(pixel[2], 255);
});
test("production PNG has 300 DPI, real white margin, and no artwork resizing", async () => {
  const params = await fixture();
  const output = await renderProductionSticker(params);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 496);
  assert.equal(metadata.height, 496);
  assert.equal(metadata.density, 300);
  const center = await sharp(output)
    .extract({ left: 160, top: 248, width: 1, height: 1 })
    .ensureAlpha()
    .raw()
    .toBuffer();
  assert.deepEqual([...center], [255, 0, 0, 255]);
  const border = await sharp(output)
    .extract({ left: 100, top: 248, width: 1, height: 1 })
    .ensureAlpha()
    .raw()
    .toBuffer();
  assert.deepEqual([...border], [255, 255, 255, 255]);
});
test("contour is based on alpha plus 2 mm, independent of the final white background", async () => {
  const source = await sharp(
    Buffer.from(
      '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="black"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const params = {
    sourceBuffer: source,
    mimeType: "image/png",
    originalWidth: 100,
    originalHeight: 100,
    state: { ...state, cutShape: "contour" as const },
  };
  const cut = await buildCutPath(params);
  assert.ok(cut.path.startsWith("M"));
  assert.ok(cut.path.length > 80);
  const output = await renderProductionSticker(params);
  const pixels = await sharp(output).ensureAlpha().raw().toBuffer();
  const pixel = (x: number, y: number) => [
    ...pixels.subarray((y * 496 + x) * 4, (y * 496 + x) * 4 + 4),
  ];
  assert.equal(pixel(0, 0)[3], 0);
  assert.deepEqual(pixel(300, 248), [255, 255, 255, 255]);
  assert.equal(pixel(330, 248)[3], 0);
});
test("layered PSD can be read back with exact placement and 300 PPI", async () => {
  initializeCanvas(
    () => {
      throw new Error("Canvas should not be needed");
    },
    (width, height) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb",
    }),
  );
  const background = await sharp({
    create: { width: 100, height: 80, channels: 4, background: "white" },
  })
    .png()
    .toBuffer();
  const layer = await sharp({
    create: { width: 20, height: 20, channels: 4, background: "red" },
  })
    .png()
    .toBuffer();
  const composite = await sharp(background)
    .composite([{ input: layer, left: 10, top: 15 }])
    .png()
    .toBuffer();
  const output = await writeLayeredPsd({
    width: 100,
    height: 80,
    background,
    composite,
    layers: [{ name: "sticker-1", png: layer, left: 10, top: 15 }],
  });
  const psd = readPsd(output, { useImageData: true, skipThumbnail: true });
  assert.equal(output.subarray(0, 4).toString(), "8BPS");
  assert.equal(psd.children?.length, 2);
  assert.equal(psd.children?.[1].left, 10);
  assert.equal(psd.children?.[1].top, 15);
  assert.equal(psd.imageResources?.resolutionInfo?.horizontalResolution, 300);
  assert.deepEqual(
    [
      ...psd.imageData!.data.slice(
        (15 * 100 + 10) * 4,
        (15 * 100 + 10) * 4 + 4,
      ),
    ],
    [255, 0, 0, 255],
  );
});
test("stale sheet identity never matches a shifted queue", () => {
  const stickers = Array.from({ length: 25 }, (_, index) => ({
    id: String(index),
    userId: "owner",
    status: "APPROVED" as const,
    finalFilePath: null,
    previewFilePath: null,
    createdAt: new Date(index),
    approvedAt: new Date(index),
    submittedAt: null,
    printedAt: null,
  }));
  const before = buildQueueLayout(stickers).sheets[0];
  const ids = before.stripes.flatMap((stripe) =>
    stripe.stickers.map((sticker) => sticker.id),
  );
  assert.equal(matchesSheetSnapshot(before, ids), true);
  assert.equal(
    matchesSheetSnapshot(buildQueueLayout(stickers.slice(1)).sheets[0], ids),
    false,
  );
});

test("approval ties have deterministic ID ordering", () => {
  const sticker = {
    userId: "owner",
    status: "APPROVED" as const,
    finalFilePath: null,
    previewFilePath: null,
    createdAt: new Date(0),
    approvedAt: new Date(0),
    submittedAt: null,
    printedAt: null,
  };
  assert.deepEqual(
    buildQueueLayout([
      { ...sticker, id: "z" },
      { ...sticker, id: "a" },
    ]).stripes[0].stickers.map((item) => item.id),
    ["a", "z"],
  );
});
