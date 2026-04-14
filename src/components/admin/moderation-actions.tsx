"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StickerStatus } from "@prisma/client";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { NerdIcon } from "@/components/ui/nerd-icon";
import { Textarea } from "@/components/ui/textarea";

type ModerationActionsProps = {
  stickerId: string;
  status: StickerStatus;
};

export function ModerationActions({ stickerId, status }: ModerationActionsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [rejectReason, setRejectReason] = useState("");
  const [pendingAction, setPendingAction] = useState<null | "approve" | "reject" | "printed">(null);

  async function runAction(action: "approve" | "reject" | "printed") {
    setPendingAction(action);

    try {
      const response = await fetch(`/api/admin/stickers/${stickerId}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: action === "reject" ? JSON.stringify({ reason: rejectReason }) : undefined,
      });

      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error ?? t("admin.actionFailed"));
      }

      toast.success(result.message ?? t("admin.updated"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("admin.actionFailed"));
    } finally {
      setPendingAction(null);
    }
  }

  if (status === "PRINTED") {
    return null;
  }

  return (
    <div className="space-y-3">
      {status === "SUBMITTED" ? (
        <>
          <div className="flex gap-3">
            <Button className="flex-1" size="sm" onClick={() => runAction("approve")} disabled={pendingAction !== null}>
              {pendingAction === "approve" ? <NerdIcon className="text-sm" name="spinner" spin /> : <NerdIcon className="text-sm" name="check" />}
              {t("admin.approve")}
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="destructive"
              onClick={() => runAction("reject")}
              disabled={pendingAction !== null}
            >
              {pendingAction === "reject" ? <NerdIcon className="text-sm" name="spinner" spin /> : <NerdIcon className="text-sm" name="reject" />}
              {t("admin.reject")}
            </Button>
          </div>
          <Textarea
            placeholder={t("admin.rejectReasonPlaceholder")}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            className="min-h-24"
          />
        </>
      ) : null}

      {status === "APPROVED" ? (
        <Button className="w-full" size="sm" variant="secondary" onClick={() => runAction("printed")} disabled={pendingAction !== null}>
          {pendingAction === "printed" ? <NerdIcon className="text-sm" name="spinner" spin /> : <NerdIcon className="text-sm" name="printer" />}
          {t("admin.markPrinted")}
        </Button>
      ) : null}
    </div>
  );
}
