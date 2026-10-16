"use client";

import { useEffect, useRef, useState } from "react";
import {
  Group,
  Image as KonvaImage,
  Layer,
  Rect,
  Stage,
  Transformer,
  Path,
} from "react-konva";
import type Konva from "konva";
import { STICKER_SIZE_PX } from "@/lib/image/constants";
import { constrainState, getCrop, getCutGeometry } from "@/lib/image/geometry";
import type { StickerEditorState } from "@/types/stickers";

type Props = {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  editorState: StickerEditorState;
  onChange: (state: StickerEditorState) => void;
  isLocked: boolean;
  cutPath?: string;
};
export function EditorStage({
  imageUrl,
  originalWidth,
  originalHeight,
  editorState,
  onChange,
  isLocked,
  cutPath,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [displaySize, setDisplaySize] = useState(320);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let disposed = false;
    const next = new window.Image();
    next.onload = () => {
      if (!disposed) setImage(next);
    };
    next.onerror = () => {
      if (!disposed) setImage(null);
    };
    next.src = imageUrl;
    return () => {
      disposed = true;
    };
  }, [imageUrl]);
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setDisplaySize(
        Math.max(
          1,
          Math.min(Math.floor(entry.contentRect.width), STICKER_SIZE_PX),
        ),
      ),
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (imageRef.current && transformerRef.current)
      transformerRef.current.nodes([imageRef.current]);
  }, [image, isLocked]);
  const ratio = displaySize / STICKER_SIZE_PX;
  const crop = getCrop(editorState, originalWidth, originalHeight);
  const geometry = getCutGeometry(editorState);
  function readNode(node: Konva.Image) {
    return constrainState(
      {
        ...editorState,
        x: node.x() / ratio,
        y: node.y() / ratio,
        scaleX: Math.abs(node.scaleX()) / ratio,
        scaleY: Math.abs(node.scaleY()) / ratio,
        rotation: ((((node.rotation() + 180) % 360) + 360) % 360) - 180,
      },
      originalWidth,
      originalHeight,
    );
  }
  function keepInside(node: Konva.Image) {
    const state = readNode(node);
    node.position({ x: state.x * ratio, y: state.y * ratio });
    node.scale({
      x: state.scaleX * ratio * (editorState.flipX ? -1 : 1),
      y: state.scaleY * ratio * (editorState.flipY ? -1 : 1),
    });
  }
  return (
    <div
      ref={containerRef}
      className="mx-auto w-full max-w-[496px] touch-none overflow-hidden rounded-2xl border-2 border-slate-500 bg-white"
      data-testid="editor-stage"
      role="img"
      aria-label="42 × 42 mm sticker template"
    >
      <Stage width={displaySize} height={displaySize}>
        <Layer>
          <Rect
            width={displaySize}
            height={displaySize}
            fill="#fff"
            listening={false}
          />
          <Group
            clipX={0}
            clipY={0}
            clipWidth={displaySize}
            clipHeight={displaySize}
          >
            {image && (
              <KonvaImage
                ref={imageRef}
                image={image}
                x={editorState.x * ratio}
                y={editorState.y * ratio}
                width={crop.width}
                height={crop.height}
                offsetX={crop.width / 2}
                offsetY={crop.height / 2}
                cropX={crop.x}
                cropY={crop.y}
                cropWidth={crop.width}
                cropHeight={crop.height}
                scaleX={
                  editorState.scaleX * ratio * (editorState.flipX ? -1 : 1)
                }
                scaleY={
                  editorState.scaleY * ratio * (editorState.flipY ? -1 : 1)
                }
                rotation={editorState.rotation}
                draggable={!isLocked}
                onDragMove={(event) => keepInside(event.target as Konva.Image)}
                onDragEnd={(event) =>
                  onChange(readNode(event.target as Konva.Image))
                }
                onTransform={(event) => keepInside(event.target as Konva.Image)}
                onTransformEnd={(event) =>
                  onChange(readNode(event.target as Konva.Image))
                }
              />
            )}
          </Group>
          <Rect
            x={geometry.safeInset * ratio}
            y={geometry.safeInset * ratio}
            width={(496 - geometry.safeInset * 2) * ratio}
            height={(496 - geometry.safeInset * 2) * ratio}
            stroke="#0284c7"
            strokeWidth={1.5}
            dash={[5, 5]}
            listening={false}
          />
          {cutPath ? (
            <Path
              data={cutPath}
              scaleX={ratio}
              scaleY={ratio}
              stroke="#d946ef"
              strokeWidth={1.5 / ratio}
              listening={false}
            />
          ) : (
            <Rect
              x={geometry.inset * ratio}
              y={geometry.inset * ratio}
              width={geometry.size * ratio}
              height={geometry.size * ratio}
              cornerRadius={geometry.radius * ratio}
              stroke="#d946ef"
              strokeWidth={1.5}
              listening={false}
            />
          )}
          {!isLocked && image && (
            <Transformer
              ref={transformerRef}
              flipEnabled={false}
              rotateEnabled
              keepRatio={false}
              anchorSize={12}
              anchorCornerRadius={4}
              borderStroke="#334155"
              anchorStroke="#334155"
              anchorFill="#fff"
              rotateAnchorOffset={20}
              boundBoxFunc={(oldBox, nextBox) =>
                Math.abs(nextBox.width) < 8 || Math.abs(nextBox.height) < 8
                  ? oldBox
                  : nextBox
              }
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
