"use client";

import type { StickerStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";

const statusConfig: Record<
  StickerStatus,
  {
    labelKey: string;
    variant: "secondary" | "warning" | "success" | "destructive";
  }
> = {
  DRAFT: {
    labelKey: "status.DRAFT",
    variant: "secondary",
  },
  SUBMITTED: {
    labelKey: "status.SUBMITTED",
    variant: "warning",
  },
  APPROVED: {
    labelKey: "status.APPROVED",
    variant: "success",
  },
  REJECTED: {
    labelKey: "status.REJECTED",
    variant: "destructive",
  },
  PRINTED: {
    labelKey: "status.PRINTED",
    variant: "secondary",
  },
};

export function StatusBadge({ status }: { status: StickerStatus }) {
  const { t } = useI18n();
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{t(config.labelKey)}</Badge>;
}
