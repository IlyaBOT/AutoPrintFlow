import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMessages, translate } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export default async function NotFound() {
  const locale = await getLocale();
  const messages = getMessages(locale);
  const t = (key: string, values?: Record<string, string | number | null | undefined>) =>
    translate(messages, key, values);

  return (
    <main className="page-shell">
      <Card className="mx-auto max-w-xl rounded-[36px]">
        <CardHeader>
          <div className="section-kicker">{t("notFound.kicker")}</div>
          <CardTitle className="text-3xl">{t("notFound.title")}</CardTitle>
          <CardDescription>{t("notFound.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">{t("notFound.backHome")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
