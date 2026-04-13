import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="page-shell">
      <Card className="mx-auto max-w-xl rounded-[36px]">
        <CardHeader>
          <div className="section-kicker">Not found</div>
          <CardTitle className="text-3xl">This page does not exist</CardTitle>
          <CardDescription>The requested resource could not be found or is no longer available in the current queue state.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
