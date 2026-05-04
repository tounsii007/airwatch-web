'use client';

import { Globe, Radar, Route, Tag } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { SectionPanel } from '@/app/(public)/settings/SectionPanel';
import { SettingRow, Toggle } from '@/app/(public)/settings/SettingPrimitives';
import type { AppLanguage } from '@/lib/types';

interface Props {
  showTrails: boolean;
  showRadar: boolean;
  showLabels: boolean;
  language: AppLanguage;
  onTrails: (v: boolean) => void;
  onRadar: (v: boolean) => void;
  onLabels: (v: boolean) => void;
}

/** Map section: trails / radar overlay / labels toggles. */
export function MapSection({ showTrails, showRadar, showLabels, language, onTrails, onRadar, onLabels }: Props) {
  return (
    <SectionPanel icon={<Globe size={12} />} title={t('map_settings', language)}>
      <div className="divide-y divide-[var(--glass-border)]">
        <SettingRow icon={<Route size={16} className="text-[var(--primary)]" />} label={t('show_routes', language)}>
          <Toggle enabled={showTrails} onToggle={onTrails} />
        </SettingRow>
        <SettingRow icon={<Radar size={16} className="text-[var(--info)]" />} label={t('radar_overlay', language)}>
          <Toggle enabled={showRadar} onToggle={onRadar} />
        </SettingRow>
        <SettingRow icon={<Tag size={16} className="text-[var(--accent)]" />} label={t('labels', language)}>
          <Toggle enabled={showLabels} onToggle={onLabels} />
        </SettingRow>
      </div>
    </SectionPanel>
  );
}
