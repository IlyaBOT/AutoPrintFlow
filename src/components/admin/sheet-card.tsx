import Link from "next/link";
import { Download, Layers3 } from "lucide-react";

import type { QueueSheet } from "@/types/stickers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function SheetCard({ sheet }: { sheet: QueueSheet }) {
  return (
    <Card className="overflow-hidden rounded-[32px]">
      <CardHeader>
        <CardTitle className="text-xl">A4 Sheet {sheet.index}</CardTitle>
        <CardDescription>
          {sheet.stripeCount} stripe{sheet.stripeCount === 1 ? "" : "s"} · {sheet.stickerCount} sticker{sheet.stickerCount === 1 ? "" : "s"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-[24px] border border-white/60 bg-white/80 p-3">
          <img src={`/api/admin/queue/sheet/${sheet.index}`} alt={`Sheet ${sheet.index}`} className="aspect-[1.414/1] w-full rounded-[20px] object-cover" />
        </div>
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button asChild className="flex-1" variant="secondary">
          <a href={`/api/admin/queue/sheet/${sheet.index}?download=1`}>
            <Download className="h-4 w-4" />
            Download A4
          </a>
        </Button>
        <Button asChild className="flex-1" variant="ghost">
          <Link href={`/admin/sheets/${sheet.index}`}>
            <Layers3 className="h-4 w-4" />
            Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
