"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Check,
  LoaderCircle,
  Move,
  PackagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { QueueManagerData } from "@/types/stickers";

export function QueuePlacementManager({ data }: { data: QueueManagerData }) {
  const { locale } = useI18n();
  const ru = locale === "ru",
    text = (a: string, b: string) => (ru ? a : b);
  const router = useRouter();
  const [state, setState] = useState(data);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState("new");
  const [slot, setSlot] = useState(0);
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const [labels, setLabels] = useState<Record<string, string>>({});
  useEffect(() => {
    setState(data);
    setSelected([]);
  }, [data]);
  async function mutate(command: Record<string, unknown>) {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/admin/queue/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...command, revision: state.revision }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) router.refresh();
        throw new Error(result.error);
      }
      setState(result);
      setSelected([]);
      setTarget("new");
      setSlot(0);
      setLabel("");
      const firstMoved = Array.isArray(command.stickerIds)
        ? command.stickerIds[0]
        : undefined;
      const movedStripe = firstMoved
        ? (result as QueueManagerData).stripes.find((stripe) =>
            stripe.slots.some((sticker) => sticker?.id === firstMoved),
          )
        : undefined;
      setPage(
        (current) =>
          movedStripe?.sheetIndex ??
          Math.max(1, Math.min(current, result.totalSheets || 1)),
      );
      toast.success(text("Раскладка сохранена", "Layout saved"));
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : text("Не удалось сохранить", "Could not save"),
      );
    } finally {
      setPending(false);
    }
  }
  const destination = state.stripes.find((stripe) => stripe.id === target);
  const occupant = destination?.slots[slot];
  const swapping =
    selected.length === 1 &&
    Boolean(occupant && !selected.includes(occupant.id));
  function move(
    ids = selected,
    targetId = target === "new" ? null : target,
    targetSlot = slot,
    swap = swapping,
  ) {
    if (!ids.length) return;
    return mutate({
      action: "move",
      stickerIds: ids,
      targetStripeId: targetId,
      targetSlot,
      swap,
      label,
    });
  }
  const visiblePage = Math.min(page, state.totalSheets || 1);
  const visible = state.stripes.filter(
    (stripe) => stripe.sheetIndex === visiblePage,
  );
  return (
    <section
      className="soft-card space-y-4 rounded-[28px] p-4 sm:p-5"
      data-testid="queue-placement-manager"
      aria-busy={pending}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            {text("Раскладка и отправления", "Layout and shipments")}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            {text(
              "Выберите до 8 стикеров и перенесите их в нужные слоты или в отдельный стрип для отправки. Ручные позиции сохраняются.",
              "Select up to 8 stickers and move them to slots or a separate shipping stripe. Manual positions are preserved.",
            )}
          </p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold">
          <input
            type="checkbox"
            className="h-5 w-5 accent-sky-600"
            checked={state.separateCustomers}
            disabled={pending}
            onChange={(event) =>
              mutate({
                action: "grouping",
                separateCustomers: event.target.checked,
              })
            }
          />
          {text(
            "Отдельный стрип каждому аккаунту",
            "Separate stripes per account",
          )}
        </label>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        {text(
          "Авторазмещение учитывает аккаунт. Ручные стрипы не заполняются автоматически и не меняются при переключении этой опции. В каждом стрипе 8 слотов, на A4 — 3 стрипа.",
          "Automatic placement follows the account. Manual stripes are never auto-filled or rearranged by this setting. Each stripe has 8 slots; each A4 sheet has 3 stripes.",
        )}
      </p>
      {selected.length > 0 && (
        <div
          className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950"
          data-testid="move-toolbar"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold">
              {text(
                `Выбрано: ${selected.length} из 8`,
                `Selected: ${selected.length} of 8`,
              )}
            </span>
            <Button
              size="icon"
              variant="ghost"
              disabled={pending}
              aria-label={text("Снять выбор", "Clear selection")}
              onClick={() => setSelected([])}
            >
              <X size={16} />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
            <label className="space-y-1 text-xs">
              {text("Куда перенести", "Destination")}
              <select
                className="studio-input"
                aria-label={text("Целевой стрип", "Target stripe")}
                value={target}
                disabled={pending}
                onChange={(event) => {
                  setTarget(event.target.value);
                  setSlot(0);
                }}
              >
                <option value="new">
                  {text("+ Отдельный новый стрип", "+ New separate stripe")}
                </option>
                {state.stripes.map((stripe) => (
                  <option key={stripe.id} value={stripe.id}>
                    {text("Стрип", "Stripe")} {stripe.index} · A4{" "}
                    {stripe.sheetIndex}
                    {stripe.label ? ` · ${stripe.label}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              {text("Начиная со слота", "Starting slot")}
              <select
                className="studio-input"
                aria-label={text("Целевой слот", "Target slot")}
                value={slot}
                disabled={pending}
                onChange={(event) => setSlot(Number(event.target.value))}
              >
                {Array.from({ length: 8 }, (_, index) => (
                  <option key={index} value={index}>
                    {index + 1}
                    {destination?.slots[index] &&
                    !selected.includes(destination.slots[index]!.id)
                      ? text(" · занят", " · occupied")
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <Button
              className="self-end"
              disabled={pending}
              onClick={() => move()}
            >
              {pending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : swapping ? (
                <ArrowRightLeft size={16} />
              ) : (
                <PackagePlus size={16} />
              )}
              {swapping
                ? text("Поменять местами", "Swap stickers")
                : text("Перенести", "Move")}
            </Button>
          </div>
          {target === "new" && (
            <input
              aria-label={text("Название отправления", "Shipment label")}
              placeholder={text(
                "Например: Отправка в Москву",
                "For example: Shipment to Moscow",
              )}
              maxLength={80}
              value={label}
              disabled={pending}
              className="studio-input"
              onChange={(event) => setLabel(event.target.value)}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <p className="mr-auto text-xs text-muted-foreground">
              {text(
                "Можно также нажать свободный слот. На компьютере доступно перетаскивание; на занятый слот — обмен двух стикеров.",
                "You can also click an empty slot. Desktop drag-and-drop supports swapping onto an occupied slot.",
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                mutate({ action: "automatic", stickerIds: selected })
              }
            >
              {text(
                "Вернуть в авторазмещение",
                "Return to automatic placement",
              )}
            </Button>
          </div>
        </div>
      )}
      {visible.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {text(
                `Лист A4 ${visiblePage} из ${state.totalSheets}`,
                `A4 sheet ${visiblePage} of ${state.totalSheets}`,
              )}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={pending || visiblePage <= 1}
                onClick={() => setPage(visiblePage - 1)}
              >
                {text("Назад", "Previous")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending || visiblePage >= state.totalSheets}
                onClick={() => setPage(visiblePage + 1)}
              >
                {text("Далее", "Next")}
              </Button>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {visible.map((stripe) => (
              <article
                key={stripe.id}
                className="min-w-0 rounded-2xl border bg-background/60 p-3"
                data-stripe-id={stripe.id}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {text("Стрип", "Stripe")} {stripe.index}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {stripe.isManual
                      ? text("Ручной", "Manual")
                      : text("Авто", "Automatic")}{" "}
                    · {stripe.slots.filter(Boolean).length}/8
                  </span>
                </div>
                <form
                  className="mb-3 flex gap-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    mutate({
                      action: "rename",
                      stripeId: stripe.id,
                      label: labels[stripe.id] ?? stripe.label ?? "",
                    });
                  }}
                >
                  <input
                    className="studio-input min-h-9 text-xs"
                    aria-label={text(
                      `Название стрипа ${stripe.index}`,
                      `Stripe ${stripe.index} label`,
                    )}
                    placeholder={text("Метка отправления", "Shipment label")}
                    maxLength={80}
                    value={labels[stripe.id] ?? stripe.label ?? ""}
                    onChange={(event) =>
                      setLabels({ ...labels, [stripe.id]: event.target.value })
                    }
                    disabled={pending}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    type="submit"
                    disabled={pending}
                    aria-label={text(
                      `Сохранить название стрипа ${stripe.index}`,
                      `Save stripe ${stripe.index} label`,
                    )}
                  >
                    <Check size={16} />
                  </Button>
                </form>
                <div className="grid grid-cols-2 gap-2">
                  {stripe.slots.map((sticker, index) => {
                    const chosen = Boolean(
                      sticker && selected.includes(sticker.id),
                    );
                    return (
                      <button
                        key={index}
                        type="button"
                        disabled={pending}
                        data-slot={index + 1}
                        data-sticker-id={sticker?.id ?? ""}
                        aria-pressed={chosen}
                        aria-label={
                          sticker
                            ? text(
                                `Стрип ${stripe.index}, слот ${index + 1}: ${sticker.userName}, ${sticker.id}`,
                                `Stripe ${stripe.index}, slot ${index + 1}: ${sticker.userName}, ${sticker.id}`,
                              )
                            : text(
                                `Стрип ${stripe.index}, свободный слот ${index + 1}`,
                                `Stripe ${stripe.index}, empty slot ${index + 1}`,
                              )
                        }
                        className={`relative flex min-h-[84px] min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border p-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60 ${chosen ? "border-sky-500 bg-sky-100 ring-2 ring-sky-500 dark:bg-sky-950" : sticker ? "border-border bg-card hover:border-sky-400" : "border-dashed border-slate-300 bg-muted/40 dark:border-slate-700"}`}
                        draggable={Boolean(sticker) && !pending}
                        onDragStart={(event) => {
                          if (sticker) {
                            event.dataTransfer.setData(
                              "text/plain",
                              sticker.id,
                            );
                            event.dataTransfer.effectAllowed = "move";
                          }
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const id = event.dataTransfer.getData("text/plain");
                          if (id)
                            move(
                              [id],
                              stripe.id,
                              index,
                              Boolean(sticker && sticker.id !== id),
                            );
                        }}
                        onClick={() => {
                          if (!sticker) {
                            if (selected.length)
                              move(selected, stripe.id, index, false);
                            return;
                          }
                          if (chosen)
                            setSelected(
                              selected.filter((id) => id !== sticker.id),
                            );
                          else if (selected.length < 8)
                            setSelected([...selected, sticker.id]);
                          else
                            toast.error(
                              text(
                                "За один перенос можно выбрать до 8 стикеров",
                                "Select up to 8 stickers per move",
                              ),
                            );
                        }}
                      >
                        <span className="absolute left-1.5 top-1 text-[10px] text-muted-foreground">
                          {index + 1}
                        </span>
                        {sticker ? (
                          <>
                            <img
                              src={`/api/stickers/${sticker.id}/asset?variant=preview`}
                              alt=""
                              className="h-12 w-12 rounded-md bg-white object-contain"
                              loading="lazy"
                              draggable={false}
                            />
                            <span
                              className="w-full truncate text-[10px] font-medium"
                              title={sticker.userEmail}
                            >
                              {sticker.userName}
                            </span>
                            {chosen && (
                              <Check
                                size={14}
                                className="absolute right-1 top-1 text-sky-600"
                              />
                            )}
                          </>
                        ) : (
                          <>
                            <Move size={16} className="text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">
                              {text("Свободно", "Empty")}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
          {text(
            "После одобрения стикеров здесь появятся стрипы для раскладки.",
            "Approved stickers will appear here for placement.",
          )}
        </p>
      )}
    </section>
  );
}
