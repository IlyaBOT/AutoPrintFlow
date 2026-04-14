import { StickerStatus } from '@prisma/client';

import { getCurrentUser } from '@/lib/auth/session';
import { jsonError, jsonSuccess } from '@/lib/http';
import { getTranslator } from '@/lib/i18n-server';
import { prisma } from '@/lib/prisma';
import { getApprovedQueueLayout } from '@/lib/queue-data';

export async function POST(_request: Request, { params }: { params: Promise<{ sheetNumber: string }> }) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  const { sheetNumber } = await params;

  if (!user || user.role !== 'ADMIN') {
    return jsonError(t('api.adminAccessRequired'), 403);
  }

  const sheetIndex = Number(sheetNumber);
  if (!Number.isInteger(sheetIndex) || sheetIndex < 1) {
    return jsonError(t('api.sheetNumberInvalid'), 400);
  }

  const { sheets } = await getApprovedQueueLayout();
  const sheet = sheets[sheetIndex - 1];

  if (!sheet) {
    return jsonError(t('api.sheetNotFound'), 404);
  }

  const stickerIds = sheet.stripes.flatMap((stripe) => stripe.stickers.map((sticker) => sticker.id));

  if (stickerIds.length === 0) {
    return jsonSuccess({ message: t('admin.updated') });
  }

  await prisma.sticker.updateMany({
    where: {
      id: { in: stickerIds },
      status: StickerStatus.APPROVED,
      printedAt: null,
    },
    data: {
      status: StickerStatus.PRINTED,
      printedAt: new Date(),
    },
  });

  return jsonSuccess({ message: t('admin.sheetMarkedPrinted') });
}
