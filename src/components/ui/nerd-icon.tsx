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
  userCircle: "👤",
  zoomIn: "⊕",
  zoomOut: "⊖",
  chevronDown: "▾",
} as const;

export type NerdIconName = keyof typeof glyphs | "imageLockOutline";

export function NerdIcon({
  className,
  name,
  spin = false,
}: {
  className?: string;
  name: NerdIconName;
  spin?: boolean;
}) {
  if (name === "imageLockOutline") {
    return (
      <span
        aria-hidden="true"
        className={cn("nf-icon inline-flex items-center justify-center leading-none", spin && "animate-spin", className)}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[1em] w-[1em]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="4.5" width="17" height="12.5" rx="2.5" />
          <circle cx="8.75" cy="9.25" r="1.2" fill="currentColor" stroke="none" />
          <path d="M5.5 15.1l4.1-4.1a1 1 0 0 1 1.4 0l2.4 2.4" />
          <path d="M12.7 13.3l1.3-1.3a1 1 0 0 1 1.4 0l1.7 1.7" />
          <path d="M14 18.3v-1a2.5 2.5 0 1 1 5 0v1" />
          <rect x="12.5" y="18.3" width="8" height="4.2" rx="1.1" />
        </svg>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn("nf-icon inline-flex items-center justify-center leading-none", spin && "animate-spin", className)}
    >
      {glyphs[name]}
    </span>
  );
}
