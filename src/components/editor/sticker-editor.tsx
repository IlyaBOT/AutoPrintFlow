"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  RotateCcw,
  RotateCw,
  Undo2,
  Redo2,
  Save,
  Send,
  Move,
  Scan,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  constrainState,
  fitState,
  fullCrop,
  getCrop,
  getCutGeometry,
  isInsideSafeArea,
} from "@/lib/image/geometry";
import type { StickerEditorState } from "@/types/stickers";
import { drawPreview } from "./preview";

const DynamicEditorStage = dynamic(
  () => import("./editor-stage").then((module) => module.EditorStage),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
    ),
  },
);
type Props = {
  legacyPreviewUrl?: string;
  initialVersion: string;
  readOnly?: boolean;
  stickerId: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "PRINTED";
  rejectReason: string | null;
  originalWidth: number;
  originalHeight: number;
  originalAssetUrl: string;
  initialState: StickerEditorState;
  stripePreviewSlots: Array<
    | { kind: "current"; id: string }
    | { kind: "existing"; id: string; imageUrl: string | null }
    | { kind: "locked" }
    | null
  >;
};
export function StickerEditor({
  legacyPreviewUrl,
  initialVersion,
  readOnly = false,
  stickerId,
  status,
  rejectReason,
  originalWidth,
  originalHeight,
  originalAssetUrl,
  initialState,
  stripePreviewSlots,
}: Props) {
  const { locale, t } = useI18n();
  const ru = locale === "ru";
  const text = (a: string, b: string) => (ru ? a : b);
  const router = useRouter();
  const initial = constrainState(
    { cutShape: "rounded", cutSizeMm: 42, borderMm: 2, ...initialState },
    originalWidth,
    originalHeight,
  );
  const [history, setHistory] = useState<StickerEditorState[]>([initial]);
  const [cursor, setCursor] = useState(0);
  const editorState = history[cursor];
  const deferred = useDeferredValue(editorState);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const dirty = JSON.stringify(editorState) !== saved;
  const [version, setVersion] = useState(initialVersion);
  const [isSaving, setIsSaving] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState(false);
  const [cutPath, setCutPath] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => {
    setPreviewOpen(window.matchMedia("(min-width: 1280px)").matches);
  }, []);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropDraft, setCropDraft] = useState(editorState.crop ?? fullCrop);
  const isLocked =
    readOnly ||
    status === "SUBMITTED" ||
    status === "APPROVED" ||
    status === "PRINTED";
  const disabled = isLocked || isSaving;
  function change(next: StickerEditorState) {
    if (disabled) return;
    const constrained = constrainState(next, originalWidth, originalHeight);
    if (JSON.stringify(constrained) === JSON.stringify(editorState)) return;
    const entries = [...history.slice(0, cursor + 1), constrained].slice(-60);
    setHistory(entries);
    setCursor(entries.length - 1);
  }
  useEffect(() => {
    let active = true;
    const next = new window.Image();
    next.onload = () => {
      if (active) setImage(next);
    };
    next.onerror = () => {
      if (active) setImageError(true);
    };
    next.src = originalAssetUrl;
    return () => {
      active = false;
    };
  }, [originalAssetUrl]);
  useEffect(() => {
    if (canvasRef.current && image)
      setCutPath(
        drawPreview(
          canvasRef.current,
          image,
          deferred,
          originalWidth,
          originalHeight,
        ),
      );
  }, [deferred, image, originalHeight, originalWidth]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty && !isLocked) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, isLocked]);
  async function persist(mode: "save" | "submit") {
    if (disabled || !image) return;
    setIsSaving(true);
    const snapshot = JSON.stringify(editorState);
    try {
      const response = await fetch(
        `/api/stickers/${stickerId}/${mode === "save" ? "state" : "submit"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ editorState, version }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? t("editor.unableToUpdate"));
      if (result.version) setVersion(result.version);
      setSaved(snapshot);
      toast.success(result.message ?? t("editor.draftSaved"));
      if (mode === "submit") router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("editor.unableToUpdate"),
      );
    } finally {
      setIsSaving(false);
    }
  }
  function zoom(factor: number) {
    change({
      ...editorState,
      scaleX: editorState.scaleX * factor,
      scaleY: editorState.scaleY * factor,
    });
  }
  const geometry = getCutGeometry(editorState);
  const safe = isInsideSafeArea(editorState, originalWidth, originalHeight);
  const crop = getCrop(editorState, originalWidth, originalHeight);
  const fitScale = Math.min(
    (496 - geometry.safeInset * 2) / crop.width,
    (496 - geometry.safeInset * 2) / crop.height,
  );
  function cropToSquare() {
    const side = Math.min(originalWidth, originalHeight);
    change(
      fitState(
        {
          ...editorState,
          crop: {
            x: (1 - side / originalWidth) / 2,
            y: (1 - side / originalHeight) / 2,
            width: side / originalWidth,
            height: side / originalHeight,
          },
        },
        originalWidth,
        originalHeight,
      ),
    );
  }
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="min-w-0 overflow-hidden rounded-[28px]">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-kicker">
              {text("Мастерская стикеров", "Sticker studio")}
            </div>
            <CardTitle className="mt-2 text-2xl">
              {text("Редактор стикера", "Sticker editor")}
            </CardTitle>
          </div>
          <StatusBadge status={status} />
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-muted/60 p-2">
              <span className="px-2 text-xs font-semibold">
                42 × 42 {text("мм", "mm")} · 300 DPI
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={text("Отменить", "Undo")}
                  disabled={disabled || cursor === 0}
                  onClick={() => setCursor(cursor - 1)}
                >
                  <Undo2 size={17} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={text("Повторить", "Redo")}
                  disabled={disabled || cursor === history.length - 1}
                  onClick={() => setCursor(cursor + 1)}
                >
                  <Redo2 size={17} />
                </Button>
              </div>
            </div>
            {legacyPreviewUrl ? (
              <img
                src={legacyPreviewUrl}
                alt={text("Сохранённый макет", "Saved artwork")}
                className="aspect-square w-full rounded-2xl border bg-white object-contain"
              />
            ) : (
              <DynamicEditorStage
                imageUrl={originalAssetUrl}
                originalWidth={originalWidth}
                originalHeight={originalHeight}
                editorState={editorState}
                onChange={change}
                isLocked={disabled}
                cutPath={cutPath}
              />
            )}
            <div className="grid gap-2 text-xs leading-5 text-muted-foreground">
              <p>
                <span className="guide-dot bg-slate-500" />
                {text(
                  "Внешняя граница: шаблон 42 мм. Рисунок не может выйти за неё.",
                  "Outer boundary: 42 mm template. Artwork stays inside it.",
                )}
              </p>
              <p>
                <span className="guide-dot bg-fuchsia-500" />
                {text(
                  "Розовая линия: фактический контур реза.",
                  "Pink line: actual cutting outline.",
                )}
              </p>
              <p>
                <span className="guide-dot bg-sky-500" />
                {text(
                  `Пунктир: рекомендуемая область рисунка, запас ${editorState.borderMm ?? 2} мм.`,
                  `Dashed: recommended artwork area, ${editorState.borderMm ?? 2} mm margin.`,
                )}
              </p>
            </div>
            {legacyPreviewUrl && (
              <p className="rounded-xl bg-muted p-3 text-xs leading-5">
                {text(
                  "Макет создан в старой версии. Здесь показан сохранённый файл для печати.",
                  "Created in an earlier version. The saved print file is shown here.",
                )}
              </p>
            )}
            {!safe && (
              <p
                role="status"
                className="rounded-xl bg-amber-100 p-3 text-xs leading-5 text-amber-950 dark:bg-amber-950 dark:text-amber-100"
              >
                {text(
                  "Рисунок выходит за безопасную область. Уменьшите его, чтобы оставить белый запас при резке.",
                  "Artwork exceeds the safe area. Reduce it to leave a white cutting margin.",
                )}
              </p>
            )}
            {imageError && (
              <p role="alert" className="text-sm text-destructive">
                {text(
                  "Не удалось загрузить изображение. Обновите страницу.",
                  "Image could not be loaded. Reload this page.",
                )}
              </p>
            )}
            {rejectReason && (
              <p className="rounded-xl bg-red-100 p-3 text-sm text-red-950">
                {rejectReason}
              </p>
            )}
          </div>
          <fieldset
            disabled={disabled}
            className="min-w-0 space-y-4 disabled:opacity-60"
          >
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  change(fitState(editorState, originalWidth, originalHeight))
                }
              >
                <Scan size={16} />
                {text("Вписать", "Fit")}
              </Button>
              <Button variant="secondary" onClick={cropToSquare}>
                <Crop size={16} />
                {text("Квадрат", "Square")}
              </Button>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="zoom"
                className="flex justify-between text-sm font-semibold"
              >
                {text("Масштаб", "Scale")}
                <span className="text-muted-foreground">
                  {Math.round((editorState.scaleX / fitScale) * 100)}%
                </span>
              </label>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("editor.zoomOut")}
                  onClick={() => zoom(0.9)}
                >
                  <ZoomOut size={17} />
                </Button>
                <input
                  id="zoom"
                  type="range"
                  min="5"
                  max="200"
                  value={Math.max(
                    5,
                    Math.min(200, (editorState.scaleX / fitScale) * 100),
                  )}
                  onChange={(event) => {
                    const scale = (fitScale * Number(event.target.value)) / 100;
                    change({
                      ...editorState,
                      scaleX: scale,
                      scaleY: (scale * editorState.scaleY) / editorState.scaleX,
                    });
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t("editor.zoomIn")}
                  onClick={() => zoom(1.1)}
                >
                  <ZoomIn size={17} />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="rotation"
                className="flex justify-between text-sm font-semibold"
              >
                {t("editor.rotation")}
                <span className="text-muted-foreground">
                  {Math.round(editorState.rotation)}°
                </span>
              </label>
              <input
                id="rotation"
                type="range"
                min="-180"
                max="180"
                value={editorState.rotation}
                onChange={(event) =>
                  change({
                    ...editorState,
                    rotation: Number(event.target.value),
                  })
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  aria-label={text("Повернуть влево на 90°", "Rotate left 90°")}
                  onClick={() =>
                    change({
                      ...editorState,
                      rotation: ((editorState.rotation - 90 + 540) % 360) - 180,
                    })
                  }
                >
                  <RotateCcw size={17} />
                  −90°
                </Button>
                <Button
                  variant="outline"
                  aria-label={text(
                    "Повернуть вправо на 90°",
                    "Rotate right 90°",
                  )}
                  onClick={() =>
                    change({
                      ...editorState,
                      rotation: ((editorState.rotation + 90 + 540) % 360) - 180,
                    })
                  }
                >
                  <RotateCw size={17} />
                  +90°
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                aria-label={text("Отразить горизонтально", "Flip horizontally")}
                onClick={() =>
                  change({ ...editorState, flipX: !editorState.flipX })
                }
              >
                <FlipHorizontal2 size={17} />
              </Button>
              <Button
                variant="outline"
                aria-label={text("Отразить вертикально", "Flip vertically")}
                onClick={() =>
                  change({ ...editorState, flipY: !editorState.flipY })
                }
              >
                <FlipVertical2 size={17} />
              </Button>
            </div>
            <details className="rounded-2xl border p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                {text("Трансформация и позиция", "Transform and position")}
              </summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {(["x", "y", "scaleX", "scaleY"] as const).map((key) => (
                  <label key={key} className="text-xs">
                    {
                      {
                        x: "X (px)",
                        y: "Y (px)",
                        scaleX: text("Ширина ×", "Width ×"),
                        scaleY: text("Высота ×", "Height ×"),
                      }[key]
                    }
                    <input
                      className="studio-input mt-1"
                      type="number"
                      step={key.startsWith("scale") ? 0.01 : 1}
                      value={Number(editorState[key].toFixed(4))}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value))
                          change({ ...editorState, [key]: value });
                      }}
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <Move size={12} className="mr-1 inline" />
                {text(
                  "Перетаскивайте рисунок и маркеры на холсте.",
                  "Drag the artwork and handles on the canvas.",
                )}
              </p>
            </details>
            <div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setCropDraft(editorState.crop ?? fullCrop);
                  setCropOpen(!cropOpen);
                }}
              >
                <Crop size={16} />
                {text("Обрезка исходника", "Crop source")}
              </Button>
              {cropOpen && (
                <div className="mt-3 space-y-3 rounded-2xl border p-3">
                  <div
                    className="checkerboard relative overflow-hidden rounded-lg"
                    style={{
                      aspectRatio: `${originalWidth} / ${originalHeight}`,
                    }}
                  >
                    <img
                      src={originalAssetUrl}
                      alt={text("Область обрезки", "Crop region")}
                      className="h-full w-full object-contain opacity-50"
                    />
                    <div
                      className="pointer-events-none absolute border-2 border-sky-500 bg-sky-400/10"
                      style={{
                        left: `${cropDraft.x * 100}%`,
                        top: `${cropDraft.y * 100}%`,
                        width: `${cropDraft.width * 100}%`,
                        height: `${cropDraft.height * 100}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(["x", "y", "width", "height"] as const).map((key) => (
                      <label key={key} className="text-xs">
                        {
                          {
                            x: text("Слева %", "Left %"),
                            y: text("Сверху %", "Top %"),
                            width: text("Ширина %", "Width %"),
                            height: text("Высота %", "Height %"),
                          }[key]
                        }
                        <input
                          className="studio-input mt-1"
                          type="number"
                          min={key === "width" || key === "height" ? 1 : 0}
                          max="100"
                          value={Math.round(cropDraft[key] * 100)}
                          onChange={(event) =>
                            setCropDraft({
                              ...cropDraft,
                              [key]:
                                Math.max(
                                  0,
                                  Math.min(100, Number(event.target.value)),
                                ) / 100,
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    disabled={
                      cropDraft.width < 0.01 ||
                      cropDraft.height < 0.01 ||
                      cropDraft.x + cropDraft.width > 1 ||
                      cropDraft.y + cropDraft.height > 1
                    }
                    onClick={() => {
                      change(
                        fitState(
                          { ...editorState, crop: cropDraft },
                          originalWidth,
                          originalHeight,
                        ),
                      );
                      setCropOpen(false);
                    }}
                  >
                    {text("Применить обрезку", "Apply crop")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      change(
                        fitState(
                          { ...editorState, crop: fullCrop },
                          originalWidth,
                          originalHeight,
                        ),
                      );
                      setCropOpen(false);
                    }}
                  >
                    {text("Убрать обрезку", "Remove crop")}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="cutShape" className="text-sm font-semibold">
                {text("Форма реза", "Cut shape")}
              </label>
              <select
                id="cutShape"
                className="studio-input"
                value={editorState.cutShape}
                onChange={(event) =>
                  change({
                    ...editorState,
                    cutShape: event.target
                      .value as StickerEditorState["cutShape"],
                  })
                }
              >
                <option value="rounded">
                  {text("Скруглённый квадрат", "Rounded square")}
                </option>
                <option value="square">{text("Квадрат", "Square")}</option>
                <option value="contour">
                  {text("По контуру изображения", "Artwork contour")}
                </option>
              </select>
              {editorState.cutShape === "contour" && (
                <p className="text-xs leading-5 text-muted-foreground">
                  {text(
                    "Контур строится по прозрачности PNG/WebP. У фотографии сначала удалите фон. Отдельные части логотипа получат отдельные контуры; внутренние отверстия не вырезаются.",
                    "Traced from PNG/WebP transparency. Remove photo backgrounds first. Separate logo parts get separate outlines; internal holes are not cut.",
                  )}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                {text("Размер реза, мм", "Cut size, mm")}
                <select
                  aria-label={text("Размер реза", "Cut size")}
                  className="studio-input mt-1"
                  value={editorState.cutSizeMm ?? 42}
                  onChange={(event) =>
                    change({
                      ...editorState,
                      cutSizeMm: Number(event.target.value),
                    })
                  }
                >
                  <option value={42}>42 × 42</option>
                  <option value={40}>40 × 40</option>
                </select>
              </label>
              <label className="text-xs">
                {text("Запас, мм", "Margin, mm")}
                <input
                  aria-label={text("Белый запас", "White margin")}
                  className="studio-input mt-1"
                  type="number"
                  min="0"
                  max="4"
                  step="0.5"
                  value={editorState.borderMm ?? 2}
                  onChange={(event) =>
                    change({
                      ...editorState,
                      borderMm: Math.max(
                        0,
                        Math.min(4, Number(event.target.value)),
                      ),
                    })
                  }
                />
              </label>
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() =>
                change(
                  fitState(
                    { ...initial, crop: fullCrop, flipX: false, flipY: false },
                    originalWidth,
                    originalHeight,
                  ),
                )
              }
            >
              <RotateCcw size={16} />
              {t("editor.reset")}
            </Button>
          </fieldset>
        </CardContent>
        <div className="editor-actions flex flex-wrap items-center gap-2 border-t p-4 sm:px-6">
          <span className="mr-auto text-xs text-muted-foreground" role="status">
            {isLocked
              ? t("editor.editingLocked")
              : dirty
                ? text("Есть несохранённые изменения", "Unsaved changes")
                : text("Все изменения сохранены", "All changes saved")}
          </span>
          <Button
            variant="secondary"
            disabled={disabled || !image}
            onClick={() => persist("save")}
          >
            <Save size={16} />
            {text("Сохранить", "Save")}
          </Button>
          <Button
            disabled={disabled || !image}
            onClick={() => persist("submit")}
          >
            <Send size={16} />
            {text("На печать", "Submit")}
          </Button>
        </div>
      </Card>
      <aside className="min-w-0 space-y-5">
        <details
          className="soft-card rounded-[24px]"
          open={previewOpen}
          onToggle={(event) => setPreviewOpen(event.currentTarget.open)}
        >
          <summary className="cursor-pointer p-4 text-sm font-semibold">
            {t("editor.finalPreviewTitle")}
          </summary>
          <div className="space-y-3 px-4 pb-4">
            <p className="text-xs leading-5 text-muted-foreground">
              {text(
                "Результат без направляющих. Прозрачные области не печатаются.",
                "Result without guides. Transparent areas are not printed.",
              )}
            </p>
            {legacyPreviewUrl ? (
              <img
                src={legacyPreviewUrl}
                alt={text("Сохранённый файл для печати", "Saved print file")}
                className="checkerboard aspect-square w-full rounded-2xl border"
              />
            ) : (
              <canvas
                ref={canvasRef}
                width={496}
                height={496}
                className="checkerboard aspect-square w-full rounded-2xl border"
              />
            )}
          </div>
        </details>
        <details className="soft-card rounded-[24px] p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            {t("editor.stripePreviewTitle")}
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {stripePreviewSlots.map((slot, index) => (
              <div
                key={index}
                className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-white text-xs text-slate-500"
              >
                {slot?.kind === "current" ? (
                  text("Ваш стикер", "Your sticker")
                ) : slot?.kind === "existing" && slot.imageUrl ? (
                  <img
                    src={slot.imageUrl}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : slot?.kind === "locked" ? (
                  text("Занято", "Reserved")
                ) : (
                  "—"
                )}
              </div>
            ))}
          </div>
        </details>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/dashboard">{t("editor.backToDashboard")}</Link>
        </Button>
      </aside>
    </div>
  );
}
