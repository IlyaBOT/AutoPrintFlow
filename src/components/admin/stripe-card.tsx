import Link from "next/link";
import { Download, Rows3 } from "lucide-react";

import type { QueueStripe } from "@/types/stickers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function StripeCard({ stripe }: { stripe: QueueStripe }) {
  return (
    <Card className="rounded-[32px]">
      <CardHeader>
        <CardTitle className="text-lg">Stripe {stripe.index}</CardTitle>
        <CardDescription>{stripe.stickerCount} / 8 sticker slots filled</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-[24px] border border-white/60 bg-white/80 p-3">
          <img src={`/api/admin/queue/stripe/${stripe.index}`} alt={`Stripe ${stripe.index}`} className="aspect-[1120/2409] w-full rounded-[20px] object-cover" />
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild className="flex-1" variant="secondary">
          <a href={`/api/admin/queue/stripe/${stripe.index}?download=1`}>
            <Download className="h-4 w-4" />
            Download stripe
          </a>
        </Button>
        <Button asChild className="flex-1" variant="ghost">
          <Link href={`/admin/stripes/${stripe.index}`}>
            <Rows3 className="h-4 w-4" />
            Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
