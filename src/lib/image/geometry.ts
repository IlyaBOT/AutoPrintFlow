import {
  MAX_EDITOR_SCALE,
  MIN_EDITOR_SCALE,
  SAFE_MARGIN_MM,
  STICKER_SIZE_MM,
  STICKER_SIZE_PX,
  mmToPx,
} from "./constants";
import type { StickerEditorState } from "@/types/stickers";

export const fullCrop = { x: 0, y: 0, width: 1, height: 1 };
export function getCrop(
  state: StickerEditorState,
  width: number,
  height: number,
) {
  const crop = state.crop ?? fullCrop;
  return {
    x: crop.x * width,
    y: crop.y * height,
    width: crop.width * width,
    height: crop.height * height,
  };
}
export function getCutGeometry(state: StickerEditorState) {
  const sizeMm = state.cutSizeMm ?? STICKER_SIZE_MM;
  const size = mmToPx(sizeMm);
  const inset = (STICKER_SIZE_PX - size) / 2;
  return {
    sizeMm,
    size,
    inset,
    safeInset: inset + mmToPx(state.borderMm ?? SAFE_MARGIN_MM),
    radius: state.cutShape === "square" ? 0 : state.cutShape ? mmToPx(2) : 8,
  };
}
export function transformedBounds(
  state: StickerEditorState,
  width: number,
  height: number,
) {
  const crop = getCrop(state, width, height);
  const angle = (state.rotation * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(angle)) * crop.width * state.scaleX +
      Math.abs(Math.sin(angle)) * crop.height * state.scaleY,
    height:
      Math.abs(Math.sin(angle)) * crop.width * state.scaleX +
      Math.abs(Math.cos(angle)) * crop.height * state.scaleY,
  };
}
// Shared by pointer controls, numeric controls and the server. Never silently crop a transformed image.
export function constrainState(
  state: StickerEditorState,
  width: number,
  height: number,
): StickerEditorState {
  const next = {
    ...state,
    scaleX: Math.max(
      MIN_EDITOR_SCALE,
      Math.min(MAX_EDITOR_SCALE, state.scaleX),
    ),
    scaleY: Math.max(
      MIN_EDITOR_SCALE,
      Math.min(MAX_EDITOR_SCALE, state.scaleY),
    ),
  };
  const bounds = transformedBounds(next, width, height);
  const shrink = Math.min(
    1,
    STICKER_SIZE_PX / bounds.width,
    STICKER_SIZE_PX / bounds.height,
  );
  next.scaleX *= shrink;
  next.scaleY *= shrink;
  const halfWidth = (bounds.width * shrink) / 2;
  const halfHeight = (bounds.height * shrink) / 2;
  next.x = Math.max(halfWidth, Math.min(STICKER_SIZE_PX - halfWidth, state.x));
  next.y = Math.max(
    halfHeight,
    Math.min(STICKER_SIZE_PX - halfHeight, state.y),
  );
  return next;
}
export function fitState(
  state: StickerEditorState,
  width: number,
  height: number,
  safe = true,
): StickerEditorState {
  const crop = getCrop(state, width, height);
  const geometry = getCutGeometry(state);
  const available = safe
    ? STICKER_SIZE_PX - geometry.safeInset * 2
    : STICKER_SIZE_PX;
  const scale = Math.min(available / crop.width, available / crop.height);
  return constrainState(
    {
      ...state,
      x: STICKER_SIZE_PX / 2,
      y: STICKER_SIZE_PX / 2,
      rotation: 0,
      scaleX: scale,
      scaleY: scale,
    },
    width,
    height,
  );
}
export function isInsideSafeArea(
  state: StickerEditorState,
  width: number,
  height: number,
) {
  const bounds = transformedBounds(state, width, height);
  const { safeInset } = getCutGeometry(state);
  return (
    state.x - bounds.width / 2 >= safeInset - 0.01 &&
    state.y - bounds.height / 2 >= safeInset - 0.01 &&
    state.x + bounds.width / 2 <= STICKER_SIZE_PX - safeInset + 0.01 &&
    state.y + bounds.height / 2 <= STICKER_SIZE_PX - safeInset + 0.01
  );
}
