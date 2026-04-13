export const runtime = "nodejs";

import { getCurrentUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";
import { getOrCreateStripeFile } from "@/lib/image/renderers";
import { getApprovedQueueLayout } from "@/lib/queue-data";
import { readStoredFile } from "@/lib/storage";

export async function GET(
  request: Request,
  context: { params: Promise<{ stripeNumber: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return jsonError("Admin access required.", 403);
  }

  const { stripeNumber } = await context.params;
  const index = Number(stripeNumber);

  if (!Number.isInteger(index) || index < 1) {
    return jsonError("Stripe number is invalid.", 422);
  }

  const { stripes } = await getApprovedQueueLayout();
  const stripe = stripes[index - 1];

  if (!stripe) {
    return jsonError("Stripe not found.", 404);
  }

  const filePath = await getOrCreateStripeFile(stripe);
  const buffer = await readStoredFile(filePath);
  const download = new URL(request.url).searchParams.get("download") === "1";

  return new Response(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="stripe-${stripe.index}.png"`,
    },
  });
}
