import { mmToPx } from "@/lib/image/constants";
import { getCrop, getCutGeometry } from "@/lib/image/geometry";
import {
  contourPath,
  dilateMask,
  traceExternalContours,
} from "@/lib/image/contours";
import type { StickerEditorState } from "@/types/stickers";

export function drawPreview(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  state: StickerEditorState,
  width: number,
  height: number,
) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";
  const crop = getCrop(state, width, height),
    geometry = getCutGeometry(state);
  context.resetTransform();
  context.clearRect(0, 0, 496, 496);
  context.save();
  context.translate(state.x, state.y);
  context.rotate((state.rotation * Math.PI) / 180);
  context.scale(
    state.scaleX * (state.flipX ? -1 : 1),
    state.scaleY * (state.flipY ? -1 : 1),
  );
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    -crop.width / 2,
    -crop.height / 2,
    crop.width,
    crop.height,
  );
  context.restore();
  let cutPath = "";
  const path = new Path2D();
  if (state.cutShape === "contour") {
    const data = context.getImageData(0, 0, 496, 496).data;
    const alpha = Uint8Array.from({ length: 496 * 496 }, (_, i) =>
      data[i * 4 + 3] >= 32 ? 1 : 0,
    );
    const mask = dilateMask(alpha, 496, 496, mmToPx(state.borderMm ?? 2));
    for (let y = 0; y < 496; y++)
      for (let x = 0; x < 496; x++)
        if (
          x < geometry.inset ||
          y < geometry.inset ||
          x + 1 > geometry.inset + geometry.size ||
          y + 1 > geometry.inset + geometry.size
        )
          mask[y * 496 + x] = 0;
    cutPath = contourPath(traceExternalContours(mask, 496, 496));
    path.addPath(new Path2D(cutPath));
  } else
    path.roundRect(
      geometry.inset,
      geometry.inset,
      geometry.size,
      geometry.size,
      geometry.radius,
    );
  context.globalCompositeOperation = "destination-over";
  context.fillStyle = "white";
  context.fill(path);
  context.globalCompositeOperation = "destination-in";
  context.fill(path);
  context.globalCompositeOperation = "source-over";
  return cutPath;
}
