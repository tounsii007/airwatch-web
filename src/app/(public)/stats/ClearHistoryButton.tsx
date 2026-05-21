'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  onClear: () => void;
  language: AppLanguage;
}

/** Dialog-confirmed wipe of the local /stats history. */
export function ClearHistoryButton({ onClear, language }: Props) {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onClear();
    setOpen(false);
  };

  return (
    <>
      <div className="pt-2 pb-8 text-center">
        <Button
          variant="danger"
          size="sm"
          leadingIcon={<Trash2 size={13} />}
          onClick={() => setOpen(true)}
          className="mx-auto"
        >
          {t('clear_data', language)}
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('clear_data', language)}
        description={t('clear_data_confirm', language)}
        size="sm"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" leadingIcon={<Trash2 size={12} />} onClick={handleConfirm}>
              {t('clear_data', language)}
            </Button>
          </div>
        }
      >
        <div className="flex items-center justify-center py-2">
          <span
            className="inline-flex items-center justify-center w-12 h-12 rounded-full"
            style={{
              background: 'color-mix(in srgb, var(--error) 12%, transparent)',
              boxShadow: '0 0 0 1px color-mix(in srgb, var(--error) 28%, transparent)',
              color: 'var(--error)',
            }}
          >
            <Trash2 size={22} />
          </span>
        </div>
      </Dialog>
    </>
  );
}
