'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

const CONFIRM = 'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30';
const DEFAULT = 'text-[var(--text-muted)] hover:text-[var(--error)] border border-[var(--glass-border)]';

interface Props {
  onClear: () => void;
  language: AppLanguage;
}

/** Two-click confirm for wiping the local /stats history. */
export function ClearHistoryButton({ onClear, language }: Props) {
  const [confirm, setConfirm] = useState(false);

  const handleClick = () => {
    if (confirm) {
      onClear();
      setConfirm(false);
    } else {
      setConfirm(true);
    }
  };

  return (
    <div className="pt-2 pb-8 text-center space-y-2">
      {confirm && (
        <p className="text-xs text-[var(--error)] font-[var(--font-body)]">{t('clear_data_confirm', language)}</p>
      )}
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider transition-colors cursor-pointer ${confirm ? CONFIRM : DEFAULT}`}
      >
        <Trash2 size={13} />
        {t('clear_data', language)}
      </button>
    </div>
  );
}
