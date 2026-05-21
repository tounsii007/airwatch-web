'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

interface Props {
  title: string;
  message: string;
  onRetry?: () => void;
}

/** Fullscreen error card for unrecoverable AR failures (denied perms, no sensors). */
export function ArErrorPanel({ title, message, onRetry }: Props) {
  const language = useSettingsStore((s) => s.language);
  return (
    <div className="fixed inset-0 bg-[var(--bg)] flex items-center justify-center p-6 z-40">
      <GlassPanel className="w-full max-w-md">
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title={title}
          body={message}
          variant="warning"
          bare
          className="p-6"
          action={
            onRetry ? (
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<RotateCw size={12} />}
                onClick={onRetry}
              >
                {t('try_again', language)}
              </Button>
            ) : undefined
          }
        />
      </GlassPanel>
    </div>
  );
}
