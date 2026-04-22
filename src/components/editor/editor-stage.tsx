"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage, Transformer } from "react-konva";
import type Konva from "konva";

import { MAX_EDITOR_SCALE, MIN_EDITOR_SCALE, STICKER_SIZE_PX } from "@/lib/image/constants";
import type { StickerEditorState } from "@/types/stickers";

type EditorStageProps = {
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  editorState: StickerEditorState;
  onChange: (nextState: StickerEditorState) => void;
  isLocked: boolean;
};

function clampScale(value: number) {
  return Math.min(MAX_EDITOR_SCALE, Math.max(MIN_EDITOR_SCALE, value));
}

export function EditorStage({
  imageUrl,
  originalWidth,
  originalHeight,
  editorState,
  onChange,
  isLocked,
}: EditorStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<Konva.Image | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [displaySize, setDisplaySize] = useState(STICKER_SIZE_PX);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const nextImage = new window.Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setDisplaySize(Math.min(Math.floor(entry.contentRect.width), STICKER_SIZE_PX));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!transformerRef.current || !imageRef.current) {
      return;
    }

    transformerRef.current.nodes([imageRef.current]);
    transformerRef.current.getLayer()?.batchDraw();
  }, [image, displaySize]);

  const ratio = useMemo(() => displaySize / STICKER_SIZE_PX, [displaySize]);

  return (
    <div ref={containerRef} className="w-full">
      <Stage
        width={displaySize}
        height={displaySize}
        className="rounded-[32px] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(229,241,255,0.65))] shadow-panel"
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={displaySize}
            height={displaySize}
            fill="rgba(255,255,255,0.7)"
            stroke="rgba(127,168,227,0.5)"
            strokeWidth={1}
            cornerRadius={36}
          />
          <Rect
            x={displaySize * 0.06}
            y={displaySize * 0.06}
            width={displaySize * 0.88}
            height={displaySize * 0.88}
            fill="rgba(196,220,255,0.18)"
            stroke="rgba(127,168,227,0.24)"
            dash={[8, 8]}
            cornerRadius={24}
          />
        </Layer>
        <Layer>
          <Group clipX={0} clipY={0} clipWidth={displaySize} clipHeight={displaySize}>
            {image ? (
              <KonvaImage
                ref={imageRef}
                image={image}
                x={editorState.x * ratio}
                y={editorState.y * ratio}
                width={originalWidth}
                height={originalHeight}
                offsetX={originalWidth / 2}
                offsetY={originalHeight / 2}
                scaleX={editorState.scaleX * ratio}
                scaleY={editorState.scaleY * ratio}
                rotation={editorState.rotation}
                draggable={!isLocked}
                onDragEnd={(event) => {
                  onChange({
                    ...editorState,
                    x: event.target.x() / ratio,
                    y: event.target.y() / ratio,
                  });
                }}
                onTransformEnd={(event) => {
                  const nextScaleX = clampScale(event.target.scaleX() / ratio);
                  const nextScaleY = clampScale(event.target.scaleY() / ratio);

                  event.target.scaleX(nextScaleX * ratio);
                  event.target.scaleY(nextScaleY * ratio);
                  onChange({
                    ...editorState,
                    x: event.target.x() / ratio,
                    y: event.target.y() / ratio,
                    scaleX: nextScaleX,
                    scaleY: nextScaleY,
                    rotation: event.target.rotation(),
                  });
                }}
              />
            ) : null}
          </Group>
          {!isLocked && image ? (
            <Transformer
              ref={transformerRef}
              rotateEnabled
              enabledAnchors={[
                "top-left",
                "top-center",
                "top-right",
                "middle-left",
                "middle-right",
                "bottom-left",
                "bottom-center",
                "bottom-right",
              ]}
              keepRatio={false}
              borderStroke="rgba(16, 31, 63, 0.9)"
              borderDash={[6, 4]}
              anchorStroke="rgba(16, 31, 63, 0.9)"
              anchorFill="white"
              anchorCornerRadius={16}
              anchorSize={10}
              boundBoxFunc={(oldBox, newBox) => {
                if (Math.abs(newBox.width) < 24 || Math.abs(newBox.height) < 24) {
                  return oldBox;
                }

                return newBox;
              }}
            />
          ) : null}
        </Layer>
      </Stage>
    </div>
  );
}
