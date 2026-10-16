import {
  ArrowRight,
  Check,
  X,
  Download,
  Pencil,
  Scan,
  Image,
  Layers,
  LockKeyhole,
  Moon,
  Printer,
  RotateCcw,
  Rows3,
  Send,
  ShieldCheck,
  LoaderCircle,
  Sparkles,
  Sticker,
  Sun,
  Upload,
  UserCircle2,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
const icons = {
  arrowRight: ArrowRight,
  check: Check,
  close: X,
  download: Download,
  edit: Pencil,
  fit: Scan,
  image: Image,
  layers: Layers,
  lock: LockKeyhole,
  moon: Moon,
  pencil: Pencil,
  printer: Printer,
  refresh: RotateCcw,
  reject: X,
  rows: Rows3,
  send: Send,
  shield: ShieldCheck,
  spinner: LoaderCircle,
  star: Sparkles,
  sticker: Sticker,
  sun: Sun,
  upload: Upload,
  userCircle: UserCircle2,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  chevronDown: ChevronDown,
  imageLockOutline: ImageOff,
};
export type NerdIconName = keyof typeof icons;
export function NerdIcon({
  className,
  name,
  spin = false,
}: {
  className?: string;
  name: NerdIconName;
  spin?: boolean;
}) {
  const Icon = icons[name];
  return (
    <Icon
      aria-hidden="true"
      className={cn(
        "inline-block h-[1em] w-[1em] shrink-0",
        spin && "animate-spin",
        className,
      )}
      strokeWidth={1.8}
    />
  );
}
