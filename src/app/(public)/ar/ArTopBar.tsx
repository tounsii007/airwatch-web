'use client';

import { ArrowLeft } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
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
      <IconButton
        aria-label={t('ar_exit', language)}
        onClick={onExit}
        variant="solid"
        size="md"
        className="glass-panel !rounded-full"
      >
        <ArrowLeft size={16} className="text-[var(--primary)]" />
      </IconButton>
    </div>
  );
}
