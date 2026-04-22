"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NerdIcon } from "@/components/ui/nerd-icon";
import { Separator } from "@/components/ui/separator";
import { MAX_EDITOR_SCALE, MIN_EDITOR_SCALE, STICKER_SIZE_PX } from "@/lib/image/constants";
import { cn } from "@/lib/utils";
import type { StickerEditorState } from "@/types/stickers";

const DynamicEditorStage = dynamic(
  () => import("@/components/editor/editor-stage").then((module) => module.EditorStage),
  {
    ssr: false,
  },
);

type StickerEditorProps = {
  stickerId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PRINTED";
  rejectReason: string | null;
  originalWidth: number;
  originalHeight: number;
  originalAssetUrl: string;
  initialState: StickerEditorState;
  stripePreviewSlots: Array<
    | {
        kind: "current";
        id: string;
      }
    | {
        kind: "existing";
        id: string;
        imageUrl: string | null;
      }
    | {
        kind: "locked";
      }
    | null
  >;
};

function buildFitState(originalWidth: number, originalHeight: number) {
  const scale = Math.min(STICKER_SIZE_PX / originalWidth, STICKER_SIZE_PX / originalHeight);
  return {
    x: STICKER_SIZE_PX / 2,
    y: STICKER_SIZE_PX / 2,
    scaleX: scale,
    scaleY: scale,
    rotation: 0,
  } satisfies StickerEditorState;
}

function buildFillState(originalWidth: number, originalHeight: number) {
  const scale = Math.max(STICKER_SIZE_PX / originalWidth, STICKER_SIZE_PX / originalHeight);
  return {
    x: STICKER_SIZE_PX / 2,
    y: STICKER_SIZE_PX / 2,
    scaleX: scale,
    scaleY: scale,
    rotation: 0,
  } satisfies StickerEditorState;
}

function clampScale(value: number) {
  return Math.min(MAX_EDITOR_SCALE, Math.max(MIN_EDITOR_SCALE, value));
}

function useLoadedImage(imageUrl: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let disposed = false;

    setImage(null);

    const nextImage = new window.Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => {
      if (!disposed) {
        setImage(nextImage);
      }
    };
    nextImage.onerror = () => {
      if (!disposed) {
        setImage(null);
      }
    };
    nextImage.src = imageUrl;

    return () => {
      disposed = true;
    };
  }, [imageUrl]);

  return image;
}

function PreviewScene({
  imageUrl,
  state,
  originalWidth,
  originalHeight,
  className,
}: {
  imageUrl: string;
  state: StickerEditorState;
  originalWidth: number;
  originalHeight: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const image = useLoadedImage(imageUrl);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, STICKER_SIZE_PX, STICKER_SIZE_PX);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, STICKER_SIZE_PX, STICKER_SIZE_PX);

    if (!image) {
      return;
    }

    context.save();
    context.beginPath();
    context.rect(0, 0, STICKER_SIZE_PX, STICKER_SIZE_PX);
    context.clip();
    context.translate(state.x, state.y);
    context.rotate((state.rotation * Math.PI) / 180);
    context.scale(state.scaleX, state.scaleY);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, -originalWidth / 2, -originalHeight / 2, originalWidth, originalHeight);
    context.restore();
  }, [image, originalHeight, originalWidth, state]);

  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-[24px] bg-white", className)}>
      <canvas ref={canvasRef} width={STICKER_SIZE_PX} height={STICKER_SIZE_PX} className="h-full w-full" />
    </div>
  );
}

function StripeSlotPreview({
  imageUrl,
  state,
  originalWidth,
  originalHeight,
  mode,
}: {
  imageUrl: string | null;
  state: StickerEditorState;
  originalWidth: number;
  originalHeight: number;
  mode: "current" | "existing" | "locked" | "empty";
}) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[22px] border border-black/5 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/85 dark:shadow-none">
      {mode === "current" ? (
        <PreviewScene
          imageUrl={imageUrl ?? ""}
          state={state}
          originalWidth={originalWidth}
          originalHeight={originalHeight}
          className="rounded-[18px] ring-1 ring-black/10 dark:ring-white/10"
        />
      ) : mode === "existing" ? (
        imageUrl ? (
          <div className="h-full overflow-hidden rounded-[18px] bg-slate-300 ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-[18px] bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <NerdIcon className="text-5xl" name="image" />
          </div>
        )
      ) : mode === "locked" ? (
        <div className="flex h-full items-center justify-center rounded-[18px] bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <NerdIcon className="text-6xl" name="imageLockOutline" />
        </div>
      ) : (
        <div className="flex h-full items-center justify-center rounded-[18px] bg-slate-300 dark:bg-slate-800">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-16 w-16 text-black dark:text-slate-200"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
            <circle cx="9" cy="10" r="1.4" fill="currentColor" stroke="none" />
            <path d="M5.5 16l4.2-4.2a1 1 0 0 1 1.4 0L14 14.7" />
            <path d="M13 13.7l1.2-1.2a1 1 0 0 1 1.4 0l2.9 2.9" />
            <path d="M4 4l16 16" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function StickerEditor({
      stickerId,
      status,
      rejectReason,
      originalWidth,
      originalHeight,
      originalAssetUrl,
      initialState,
      stripePreviewSlots,
}: StickerEditorProps) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [editorState, setEditorState] = useState<StickerEditorState>(initialState);
  const deferredState = useDeferredValue(editorState);
  const [isSaving, setIsSaving] = useState(false);
  const isLocked = status === "SUBMITTED" || status === "APPROVED" || status === "PRINTED";

  const fitState = useMemo(() => buildFitState(originalWidth, originalHeight), [originalHeight, originalWidth]);
  const fillState = useMemo(() => buildFillState(originalWidth, originalHeight), [originalHeight, originalWidth]);

  async function persist(mode: "save" | "submit") {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/stickers/${stickerId}/${mode === "save" ? "state" : "submit"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ editorState }),
      });

      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? t("editor.unableToUpdate"));
      }

      toast.success(result.message ?? (mode === "save" ? t("editor.draftSaved") : t("editor.stickerSubmitted")));
      startTransition(() => {
        router.refresh();
        if (mode === "submit") {
          router.push("/dashboard");
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("editor.unableToUpdate"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <Card className="rounded-[36px]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="section-kicker">{t("editor.step")}</div>
            <CardTitle className={cn(locale === "ru" ? "text-2xl sm:text-[1.7rem]" : "text-3xl")}>
              {t("editor.title")}
            </CardTitle>
            <CardDescription>{t("editor.description")}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            {isLocked ? (
              <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-slate-600">
                <NerdIcon className="text-sm" name="lock" />
                {t("editor.editingLocked")}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="mx-auto w-full max-w-[496px] space-y-4">
            <DynamicEditorStage
              imageUrl={originalAssetUrl}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
              editorState={editorState}
              onChange={setEditorState}
              isLocked={isLocked}
            />
            <div className="rounded-[26px] bg-slate-950 px-5 py-4 text-sm text-slate-200">
              {t("editor.deterministic")}
            </div>
          </div>

          <div className="space-y-5">
            {status === "REJECTED" && rejectReason ? (
              <Card className="rounded-[28px] border-red-200/80 bg-red-50/80">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900">{t("editor.rejectedByModeration")}</CardTitle>
                  <CardDescription className="text-red-800/80">{rejectReason}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Button type="button" variant="secondary" onClick={() => setEditorState(fitState)} disabled={isLocked}>
                <NerdIcon className="text-sm" name="fit" />
                {t("editor.fit")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditorState(fillState)} disabled={isLocked}>
                {t("editor.fill")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditorState(fitState)} disabled={isLocked}>
                <NerdIcon className="text-sm" name="refresh" />
                {t("editor.reset")}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setEditorState((current) => ({
                    ...current,
                    scaleX: clampScale(current.scaleX * 1.06),
                    scaleY: clampScale(current.scaleY * 1.06),
                  }))
                }
                disabled={isLocked}
              >
                <NerdIcon className="text-sm" name="zoomIn" />
                {t("editor.zoomIn")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setEditorState((current) => ({
                    ...current,
                    scaleX: clampScale(current.scaleX * 0.94),
                    scaleY: clampScale(current.scaleY * 0.94),
                  }))
                }
                disabled={isLocked}
              >
                <NerdIcon className="text-sm" name="zoomOut" />
                {t("editor.zoomOut")}
              </Button>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scaleX">{t("editor.horizontalScale")}</Label>
                <Input
                  id="scaleX"
                  type="range"
                  min={MIN_EDITOR_SCALE}
                  max={MAX_EDITOR_SCALE}
                  step="0.01"
                  value={editorState.scaleX}
                  disabled={isLocked}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      scaleX: clampScale(Number(event.target.value)),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scaleY">{t("editor.verticalScale")}</Label>
                <Input
                  id="scaleY"
                  type="range"
                  min={MIN_EDITOR_SCALE}
                  max={MAX_EDITOR_SCALE}
                  step="0.01"
                  value={editorState.scaleY}
                  disabled={isLocked}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      scaleY: clampScale(Number(event.target.value)),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rotation">{t("editor.rotation")}</Label>
                <Input
                  id="rotation"
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={editorState.rotation}
                  disabled={isLocked}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      rotation: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <Button type="button" onClick={() => persist("save")} disabled={isLocked || isSaving}>
                {isSaving ? <NerdIcon className="text-sm" name="spinner" spin /> : null}
                {t("editor.saveDraft")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => persist("submit")} disabled={isLocked || isSaving}>
                <NerdIcon className="text-sm" name="send" />
                {t("editor.submitForModeration")}
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link href="/dashboard">{t("editor.backToDashboard")}</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[36px]">
          <CardHeader>
            <CardTitle>{t("editor.finalPreviewTitle")}</CardTitle>
            <CardDescription>{t("editor.finalPreviewDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <PreviewScene
              imageUrl={originalAssetUrl}
              state={deferredState}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
              className="border border-black"
            />
          </CardContent>
        </Card>

        <Card className="rounded-[36px] border-sky-100/80 bg-[linear-gradient(180deg,rgba(210,230,255,0.84),rgba(170,207,255,0.78))] dark:border-slate-700/80 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))]">
          <CardHeader>
            <CardTitle>{t("editor.stripePreviewTitle")}</CardTitle>
            <CardDescription>{t("editor.stripePreviewDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[28px] border border-black/5 bg-slate-950/95 p-4 text-white shadow-soft dark:border-white/10 dark:bg-slate-950/70">
              <div className="grid grid-cols-2 gap-2">
                {stripePreviewSlots.map((slot, index) => (
                  <StripeSlotPreview
                    key={slot && "id" in slot ? slot.id : `${slot?.kind ?? "empty"}-${index}`}
                    imageUrl={
                      slot?.kind === "existing"
                        ? slot.imageUrl
                        : slot?.kind === "current"
                          ? originalAssetUrl
                          : null
                    }
                    state={deferredState}
                    originalWidth={originalWidth}
                    originalHeight={originalHeight}
                    mode={slot?.kind ?? "empty"}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300">
              {t("editor.stripePreviewNote")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
