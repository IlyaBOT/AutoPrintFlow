import type { Metadata } from "next";

import "@/app/globals.css";

import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AutoPrintFlow",
  description: "Production-ready sticker upload, moderation, and print queue management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-sheet-grid bg-[length:80px_80px] opacity-[0.18]" />
          <div className="relative z-10 min-h-screen">
            <SiteHeader />
            {children}
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
