import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List
    className={cn("inline-flex rounded-full border border-white/60 bg-white/60 p-1 shadow-soft", className)}
    {...props}
  />
);

const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-slate-900 data-[state=active]:text-white",
      className,
    )}
    {...props}
  />
);

const TabsContent = ({ className, ...props }: TabsPrimitive.TabsContentProps) => (
  <TabsPrimitive.Content className={cn("mt-6 outline-none", className)} {...props} />
);

export { Tabs, TabsContent, TabsList, TabsTrigger };
