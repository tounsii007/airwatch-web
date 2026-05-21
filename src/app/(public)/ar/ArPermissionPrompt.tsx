'use client';

import { Camera, Compass, MapPin, ScanEye } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { NeonText } from '@/components/ui/NeonText';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';

interface Props {
  busy: boolean;
  error: string | null;
  onStart: () => void;
}

function PermItem({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 text-left">
      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0 text-[var(--primary)]">
        {icon}
      </div>
      <div>
        <div className="text-sm font-[var(--font-body)] font-bold text-[var(--text-primary)]">{title}</div>
        <div className="text-[11px] text-[var(--text-muted)] font-[var(--font-body)]">{detail}</div>
      </div>
    </div>
  );
}

/** First-run screen: explains required permissions before a user-gesture grant. */
export function ArPermissionPrompt({ busy, error, onStart }: Props) {
  const language = useSettingsStore((s) => s.language);
  return (
    <div className="fixed inset-0 bg-[var(--bg)] flex items-center justify-center p-6 z-40">
      <GlassPanel className="w-full max-w-md p-6 space-y-5 text-center">
        <div className="flex flex-col items-center gap-2">
          <ScanEye size={40} className="text-[var(--primary)] drop-shadow-[0_0_10px_var(--primary)]" />
          <NeonText text={t('ar_spotting_title', language)} size="text-lg" />
          <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)]">
            {t('ar_intro', language)}
          </p>
        </div>

        <div className="space-y-3">
          <PermItem
            icon={<Camera size={16} />}
            title={t('ar_perm_camera_title', language)}
            detail={t('ar_perm_camera_detail', language)}
          />
          <PermItem
            icon={<MapPin size={16} />}
            title={t('ar_perm_location_title', language)}
            detail={t('ar_perm_location_detail', language)}
          />
          <PermItem
            icon={<Compass size={16} />}
            title={t('ar_perm_compass_title', language)}
            detail={t('ar_perm_compass_detail', language)}
          />
        </div>

        {error && (
          <p className="text-xs text-[var(--error)] font-[var(--font-body)] border border-[var(--error)]/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          onClick={onStart}
          loading={busy}
          className="w-full"
        >
          {busy ? t('ar_starting', language) : t('ar_start_button', language)}
        </Button>
      </GlassPanel>
    </div>
  );
}
