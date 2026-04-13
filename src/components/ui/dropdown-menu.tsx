import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuContent = ({
  className,
  sideOffset = 8,
  ...props
}: DropdownMenuPrimitive.DropdownMenuContentProps) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-48 rounded-2xl border border-white/60 bg-white/90 p-2 shadow-panel backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
);

const DropdownMenuItem = ({
  className,
  inset,
  ...props
}: DropdownMenuPrimitive.DropdownMenuItemProps & { inset?: boolean }) => (
  <DropdownMenuPrimitive.Item
    className={cn(
      "relative flex cursor-default select-none items-center rounded-xl px-3 py-2 text-sm text-slate-800 outline-none transition hover:bg-slate-100/80 focus:bg-slate-100/80",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
);

const DropdownMenuLabel = ({
  className,
  inset,
  ...props
}: DropdownMenuPrimitive.DropdownMenuLabelProps & { inset?: boolean }) => (
  <DropdownMenuPrimitive.Label
    className={cn("px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500", inset && "pl-8", className)}
    {...props}
  />
);

const DropdownMenuSeparator = ({
  className,
  ...props
}: DropdownMenuPrimitive.DropdownMenuSeparatorProps) => (
  <DropdownMenuPrimitive.Separator className={cn("my-2 h-px bg-slate-200", className)} {...props} />
);

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};
