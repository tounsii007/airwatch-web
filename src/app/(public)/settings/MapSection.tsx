'use client';

import { CloudSun, Globe, Image as ImageIcon, Radar, Route, Tag } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { Switch } from '@/components/ui/Switch';
import { SectionPanel } from '@/app/(public)/settings/SectionPanel';
import { SettingRow } from '@/app/(public)/settings/SettingPrimitives';
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
          <Switch checked={showTrails} onChange={onTrails} size="sm" />
        </SettingRow>
        <SettingRow icon={<Radar size={16} className="text-[var(--info)]" />} label={t('radar_overlay', language)}>
          <Switch checked={showRadar} onChange={onRadar} size="sm" />
        </SettingRow>
        <SettingRow icon={<Tag size={16} className="text-[var(--accent)]" />} label={t('labels', language)}>
          <Switch checked={showLabels} onChange={onLabels} size="sm" />
        </SettingRow>
        <SettingRow
          icon={<CloudSun size={16} className="text-[var(--info)]" />}
          label={t('show_airport_weather', language)}
          hint={t('show_airport_weather_hint', language)}
        >
          <Switch checked={showAirportWeather} onChange={onAirportWeather} size="sm" />
        </SettingRow>
        <SettingRow
          icon={<ImageIcon size={16} className="text-[var(--accent)]" />}
          label={t('show_aircraft_photos', language)}
          hint={t('show_aircraft_photos_hint', language)}
        >
          <Switch checked={showAircraftPhotos} onChange={onAircraftPhotos} size="sm" />
        </SettingRow>
      </div>
    </SectionPanel>
  );
}
