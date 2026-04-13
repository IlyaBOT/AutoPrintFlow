import type { StickerStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  StickerStatus,
  {
    label: string;
    variant: "secondary" | "warning" | "success" | "destructive";
  }
> = {
  DRAFT: {
    label: "Draft",
    variant: "secondary",
  },
  SUBMITTED: {
    label: "Submitted",
    variant: "warning",
  },
  APPROVED: {
    label: "Approved",
    variant: "success",
  },
  REJECTED: {
    label: "Rejected",
    variant: "destructive",
  },
  PRINTED: {
    label: "Printed",
    variant: "secondary",
  },
};

export function StatusBadge({ status }: { status: StickerStatus }) {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
