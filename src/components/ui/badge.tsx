import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950",
        secondary: "bg-white/70 text-slate-700 dark:bg-slate-100/10 dark:text-slate-200",
        success: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        warning: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        destructive: "bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
