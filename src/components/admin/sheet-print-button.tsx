"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { useI18n } from '@/components/providers/i18n-provider';
import { Button } from '@/components/ui/button';
import { NerdIcon } from '@/components/ui/nerd-icon';

export function SheetPrintButton({ sheetIndex, className }: { sheetIndex: number; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    try {
      const response = await fetch(`/api/admin/sheets/${sheetIndex}/printed`, { method: 'POST' });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        throw new Error(result.error ?? t('admin.actionFailed'));
      }
      toast.success(result.message ?? t('admin.sheetMarkedPrinted'));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.actionFailed'));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" className={className} onClick={handleClick} disabled={isPending}>
      <NerdIcon className="text-sm" name={isPending ? 'spinner' : 'printer'} spin={isPending} />
      {t('admin.markSheetPrinted')}
    </Button>
  );
}
