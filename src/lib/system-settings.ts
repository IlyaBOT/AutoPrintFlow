import "server-only";

import { prisma } from "@/lib/prisma";

export const DEFAULT_SYSTEM_SETTINGS = {
  id: 1,
  instanceName: "AutoPrint Flow",
  instanceIconFilePath: null,
  stripeBackgroundPath: null,
  stripeFooterText: 'Printed in "AutoPrint Flow. {year}"',
  stripeFooterFontSizePt: 18,
} as const;

export async function getSystemSettings() {
  const settings = await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      instanceName: DEFAULT_SYSTEM_SETTINGS.instanceName,
      stripeFooterText: DEFAULT_SYSTEM_SETTINGS.stripeFooterText,
      stripeFooterFontSizePt: DEFAULT_SYSTEM_SETTINGS.stripeFooterFontSizePt,
    },
  });

  return settings;
}

export function resolveStripeFooterText(template: string, year = new Date().getFullYear()) {
  return template.replace(/\{year\}/g, String(year));
}

export function convertPtToPx(value: number) {
  return Math.max(8, Math.round((value * 96) / 72));
}
