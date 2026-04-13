"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LoaderCircle, RefreshCcw, ScanSearch, Send, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}: {
  imageUrl: string;
  state: StickerEditorState;
  originalWidth: number;
  originalHeight: number;
  filled: boolean;
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
          Empty
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
        throw new Error(result.error ?? "Unable to update the sticker.");
      }

      toast.success(result.message ?? (mode === "save" ? "Draft saved." : "Sticker submitted."));
      startTransition(() => {
        router.refresh();
        if (mode === "submit") {
          router.push("/dashboard");
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update the sticker.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <Card className="rounded-[36px]">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="section-kicker">Step 2</div>
            <CardTitle className="text-3xl">Position the artwork inside the 42x42 mm frame</CardTitle>
            <CardDescription>
              Drag the image, scale it freely, stretch it horizontally or vertically, and rotate it if needed. The final export is a 496x496 px PNG.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={status} />
            {isLocked ? (
              <div className="flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm text-slate-600">
                <Lock className="h-4 w-4" />
                Editing locked
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
              The editor output is deterministic: the same transform state will always render the same PNG, stripe slot, and A4 sheet placement on the server.
            </div>
          </div>

          <div className="space-y-5">
            {status === "REJECTED" && rejectReason ? (
              <Card className="rounded-[28px] border-red-200/80 bg-red-50/80">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900">Rejected by moderation</CardTitle>
                  <CardDescription className="text-red-800/80">{rejectReason}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Button type="button" variant="secondary" onClick={() => setEditorState(fitState)} disabled={isLocked}>
                <ScanSearch className="h-4 w-4" />
                Fit
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditorState(fillState)} disabled={isLocked}>
                Fill
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditorState(fitState)} disabled={isLocked}>
                <RefreshCcw className="h-4 w-4" />
                Reset
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
                <ZoomIn className="h-4 w-4" />
                Zoom in
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
                <ZoomOut className="h-4 w-4" />
                Zoom out
              </Button>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scaleX">Horizontal scale</Label>
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
                <Label htmlFor="scaleY">Vertical scale</Label>
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
                <Label htmlFor="rotation">Rotation</Label>
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
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Save draft
              </Button>
              <Button type="button" variant="secondary" onClick={() => persist("submit")} disabled={isLocked || isSaving}>
                <Send className="h-4 w-4" />
                Submit for moderation
              </Button>
              <Button asChild type="button" variant="ghost">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[36px]">
          <CardHeader>
            <CardTitle>Final sticker preview</CardTitle>
            <CardDescription>Live square output before the 496x496 px PNG is written to storage.</CardDescription>
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
            <CardTitle>Stripe placement preview</CardTitle>
            <CardDescription>
              Approved stickers are grouped into stripes of 8. Your sticker occupies one protected slot once moderation passes.
            </CardDescription>
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
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-600">
              The live mockup mirrors the production stripe generator: 2 columns, 4 rows, soft white sticker cards, and a black footer band.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
