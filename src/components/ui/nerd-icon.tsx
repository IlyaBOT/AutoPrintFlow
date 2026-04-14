import { cn } from "@/lib/utils";

const glyphs = {
  arrowRight: "→",
  check: "✓",
  close: "✕",
  download: "↓",
  edit: "✎",
  fit: "⤢",
  image: "▣",
  layers: "▤",
  lock: "⛒",
  moon: "☾",
  pencil: "✎",
  printer: "⎙",
  refresh: "↻",
  reject: "✕",
  rows: "☰",
  send: "➜",
  shield: "⛨",
  spinner: "◌",
  star: "★",
  sticker: "⬚",
  sun: "☼",
  upload: "↑",
  zoomIn: "⊕",
  zoomOut: "⊖",
  chevronDown: "▾",
} as const;

export type NerdIconName = keyof typeof glyphs;

export function NerdIcon({
  className,
  name,
  spin = false,
}: {
  className?: string;
  name: NerdIconName;
  spin?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("nf-icon inline-flex items-center justify-center leading-none", spin && "animate-spin", className)}
    >
      {glyphs[name]}
    </span>
  );
}
