"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { STICKER_SIZE_PX } from "@/lib/image/constants";
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
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-[24px] bg-white", className)}>
      <svg viewBox={`0 0 ${STICKER_SIZE_PX} ${STICKER_SIZE_PX}`} className="h-full w-full" preserveAspectRatio="none">
        <g transform={`translate(${state.x} ${state.y})`}>
          <g transform={`rotate(${state.rotation})`}>
            <g transform={`scale(${state.scaleX} ${state.scaleY})`}>
              <image
                href={imageUrl}
                x={-originalWidth / 2}
                y={-originalHeight / 2}
                width={originalWidth}
                height={originalHeight}
                preserveAspectRatio="none"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

function StripeSlotPreview({
  imageUrl,
  state,
  originalWidth,
  originalHeight,
  filled,
  emptyLabel,
}: {
  imageUrl: string;
  state: StickerEditorState;
  originalWidth: number;
  originalHeight: number;
  filled: boolean;
  emptyLabel: string;
}) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-[18px] border border-white/70 bg-white/95 shadow-sm">
      {filled ? (
        <PreviewScene
          imageUrl={imageUrl}
          state={state}
          originalWidth={originalWidth}
          originalHeight={originalHeight}
          className="rounded-[18px]"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
          {emptyLabel}
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
}: StickerEditorProps) {
  const { t } = useI18n();
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
            <CardTitle className="text-3xl">{t("editor.title")}</CardTitle>
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
          <div className="space-y-4">
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
                    scaleX: current.scaleX * 1.06,
                    scaleY: current.scaleY * 1.06,
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
                    scaleX: current.scaleX * 0.94,
                    scaleY: current.scaleY * 0.94,
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
                  min="0.1"
                  max="4"
                  step="0.01"
                  value={editorState.scaleX}
                  disabled={isLocked}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      scaleX: Number(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scaleY">{t("editor.verticalScale")}</Label>
                <Input
                  id="scaleY"
                  type="range"
                  min="0.1"
                  max="4"
                  step="0.01"
                  value={editorState.scaleY}
                  disabled={isLocked}
                  onChange={(event) =>
                    setEditorState((current) => ({
                      ...current,
                      scaleY: Number(event.target.value),
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

        <Card className="rounded-[36px] bg-[linear-gradient(180deg,rgba(210,230,255,0.84),rgba(170,207,255,0.78))]">
          <CardHeader>
            <CardTitle>{t("editor.stripePreviewTitle")}</CardTitle>
            <CardDescription>{t("editor.stripePreviewDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[28px] bg-slate-950/95 p-4 text-white shadow-soft">
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 8 }, (_, index) => (
                  <StripeSlotPreview
                    key={index}
                    imageUrl={originalAssetUrl}
                    state={deferredState}
                    originalWidth={originalWidth}
                    originalHeight={originalHeight}
                    filled={index === 0}
                    emptyLabel={t("editor.emptySlot")}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-600">
              {t("editor.stripePreviewNote")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
