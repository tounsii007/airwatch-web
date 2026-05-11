'use client';

import { ArrowLeft } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';

interface Props {
  onExit: () => void;
}

/** Minimal top bar with a back button; keeps the camera view uncluttered. */
export function ArTopBar({ onExit }: Props) {
  const language = useSettingsStore((s) => s.language);
  return (
    <div className="absolute top-4 left-4 z-10">
      <button
        onClick={onExit}
        className="w-9 h-9 rounded-full glass-panel flex items-center justify-center text-[var(--primary)] hover:bg-[var(--primary)]/15 transition-colors cursor-pointer"
        aria-label={t('ar_exit', language)}
      >
        <ArrowLeft size={16} />
      </button>
    </div>
  );
}
