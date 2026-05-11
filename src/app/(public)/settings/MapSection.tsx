'use client';

import { CloudSun, Globe, Image as ImageIcon, Radar, Route, Tag } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { SectionPanel } from '@/app/(public)/settings/SectionPanel';
import { SettingRow, Toggle } from '@/app/(public)/settings/SettingPrimitives';
import type { AppLanguage } from '@/lib/types';

interface Props {
  showTrails: boolean;
  showRadar: boolean;
  showLabels: boolean;
  showAircraftPhotos: boolean;
  showAirportWeather: boolean;
  language: AppLanguage;
  onTrails: (v: boolean) => void;
  onRadar: (v: boolean) => void;
  onLabels: (v: boolean) => void;
  onAircraftPhotos: (v: boolean) => void;
  onAirportWeather: (v: boolean) => void;
}

/** Map section: trails / radar overlay / labels toggles. */
export function MapSection({
  showTrails, showRadar, showLabels, showAircraftPhotos, showAirportWeather,
  language, onTrails, onRadar, onLabels, onAircraftPhotos, onAirportWeather,
}: Props) {
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
        <SettingRow
          icon={<CloudSun size={16} className="text-[var(--info)]" />}
          label={t('show_airport_weather', language)}
          hint={t('show_airport_weather_hint', language)}
        >
          <Toggle enabled={showAirportWeather} onToggle={onAirportWeather} />
        </SettingRow>
        <SettingRow
          icon={<ImageIcon size={16} className="text-[var(--accent)]" />}
          label={t('show_aircraft_photos', language)}
          hint={t('show_aircraft_photos_hint', language)}
        >
          <Toggle enabled={showAircraftPhotos} onToggle={onAircraftPhotos} />
        </SettingRow>
      </div>
    </SectionPanel>
  );
}
