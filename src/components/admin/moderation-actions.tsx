"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StickerStatus } from "@prisma/client";
import { CheckCheck, LoaderCircle, Printer, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ModerationActionsProps = {
  stickerId: string;
  status: StickerStatus;
};

export function ModerationActions({ stickerId, status }: ModerationActionsProps) {
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
        throw new Error(result.error ?? "Admin action failed.");
      }

      toast.success(result.message ?? "Updated.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin action failed.");
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
              {pendingAction === "approve" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Approve
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="destructive"
              onClick={() => runAction("reject")}
              disabled={pendingAction !== null}
            >
              {pendingAction === "reject" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Reject
            </Button>
          </div>
          <Textarea
            placeholder="Reject reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            className="min-h-24"
          />
        </>
      ) : null}

      {status === "APPROVED" ? (
        <Button className="w-full" size="sm" variant="secondary" onClick={() => runAction("printed")} disabled={pendingAction !== null}>
          {pendingAction === "printed" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Mark printed
        </Button>
      ) : null}
    </div>
  );
}
