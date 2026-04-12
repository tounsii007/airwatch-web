'use client';

import { useEffect } from 'react';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import type { AltitudeUnit, AppLanguage, AppTheme, SpeedUnit } from '@/lib/types';
import Link from 'next/link';
import {
  Globe,
  Monitor,
  Moon,
  MountainSnow,
  Palette,
  Ruler,
  Sun,
  Gauge,
  Route,
  Radar,
  RefreshCw,
  Tag,
  BarChart2,
  ChevronRight,
} from 'lucide-react';

/* --- Option selector chip group --- */
interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider transition-all ${
              active
                ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* --- Toggle switch --- */
function Toggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled ? 'bg-[var(--primary)]' : 'bg-[var(--text-muted)]/30'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

/* --- Setting row --- */
function SettingRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm font-[var(--font-body)] text-[var(--text-primary)]">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

/* --- Language options (never localized — always show code) --- */
const languageOptions: ChipOption<AppLanguage>[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
  { value: 'fr', label: 'FR' },
];

export default function SettingsPage() {
  const {
    theme,
    language,
    altitudeUnit,
    speedUnit,
    showTrails,
    showRadar,
    showLabels,
    updateInterval,
    setTheme,
    setLanguage,
    setAltitudeUnit,
    setSpeedUnit,
    setShowTrails,
    setShowRadar,
    setShowLabels,
    setUpdateInterval,
  } = useSettingsStore();

  // Update html lang attribute when language changes
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center py-3">
        <NeonText text={t('settings', language)} size="text-xl" />
      </div>

      {/* Appearance */}
      <GlassPanel className="p-4">
        <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-3 flex items-center gap-2">
          <Palette size={12} />
          {t('appearance', language)}
        </h3>

        <div className="space-y-1">
          <div className="py-2">
            <span className="text-xs text-[var(--text-secondary)] font-[var(--font-body)] mb-2 block">
              {t('theme', language)}
            </span>
            <ChipGroup options={[
              { value: 'dark' as AppTheme, label: t('theme_dark', language), icon: <Moon size={12} /> },
              { value: 'light' as AppTheme, label: t('theme_light', language), icon: <Sun size={12} /> },
              { value: 'system' as AppTheme, label: t('theme_system', language), icon: <Monitor size={12} /> },
            ]} value={theme} onChange={setTheme} />
          </div>

          <div className="border-t border-[var(--glass-border)]" />

          <div className="py-2">
            <span className="text-xs text-[var(--text-secondary)] font-[var(--font-body)] mb-2 block">
              {t('language', language)}
            </span>
            <ChipGroup options={languageOptions} value={language} onChange={setLanguage} />
          </div>
        </div>
      </GlassPanel>

      {/* Units */}
      <GlassPanel className="p-4">
        <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-3 flex items-center gap-2">
          <Ruler size={12} />
          {t('units', language)}
        </h3>

        <div className="space-y-1">
          <div className="py-2">
            <span className="text-xs text-[var(--text-secondary)] font-[var(--font-body)] mb-2 flex items-center gap-1.5">
              <MountainSnow size={12} />
              {t('altitude_short', language)}
            </span>
            <ChipGroup options={[
              { value: 'feet' as AltitudeUnit, label: t('unit_feet', language) },
              { value: 'meters' as AltitudeUnit, label: t('unit_meters', language) },
            ]} value={altitudeUnit} onChange={setAltitudeUnit} />
          </div>

          <div className="border-t border-[var(--glass-border)]" />

          <div className="py-2">
            <span className="text-xs text-[var(--text-secondary)] font-[var(--font-body)] mb-2 flex items-center gap-1.5">
              <Gauge size={12} />
              {t('speed_short', language)}
            </span>
            <ChipGroup options={[
              { value: 'knots' as SpeedUnit, label: t('unit_knots', language) },
              { value: 'kmh' as SpeedUnit, label: t('unit_kmh', language) },
              { value: 'mph' as SpeedUnit, label: t('unit_mph', language) },
            ]} value={speedUnit} onChange={setSpeedUnit} />
          </div>
        </div>
      </GlassPanel>

      {/* Map Settings */}
      <GlassPanel className="p-4">
        <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-3 flex items-center gap-2">
          <Globe size={12} />
          {t('map_settings', language)}
        </h3>

        <div className="divide-y divide-[var(--glass-border)]">
          <SettingRow
            icon={<Route size={16} className="text-[var(--primary)]" />}
            label={t('show_routes', language)}
          >
            <Toggle enabled={showTrails} onToggle={setShowTrails} />
          </SettingRow>

          <SettingRow
            icon={<Radar size={16} className="text-[var(--info)]" />}
            label={t('radar_overlay', language)}
          >
            <Toggle enabled={showRadar} onToggle={setShowRadar} />
          </SettingRow>

          <SettingRow
            icon={<Tag size={16} className="text-[var(--accent)]" />}
            label={t('labels', language)}
          >
            <Toggle enabled={showLabels} onToggle={setShowLabels} />
          </SettingRow>
        </div>
      </GlassPanel>

      {/* Update Interval */}
      <GlassPanel className="p-4">
        <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-3 flex items-center gap-2">
          <RefreshCw size={12} />
          {t('update_interval', language)}
        </h3>
        <div className="py-2">
          <ChipGroup
            options={[
              { value: '60', label: `1 ${t('interval_min', language)}` },
              { value: '180', label: `3 ${t('interval_min', language)}` },
              { value: '300', label: `5 ${t('interval_min', language)}` },
              { value: '600', label: `10 ${t('interval_min', language)}` },
            ]}
            value={String(updateInterval)}
            onChange={(v) => setUpdateInterval(Number(v))}
          />
        </div>
      </GlassPanel>

      {/* My Statistics */}
      <GlassPanel className="p-4">
        <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-3 flex items-center gap-2">
          <BarChart2 size={12} />
          {t('my_statistics', language)}
        </h3>
        <Link
          href="/stats"
          className="flex items-center justify-between py-2 text-sm font-[var(--font-body)] text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <BarChart2 size={16} className="text-[var(--primary)]" />
            {t('stats', language)}
          </div>
          <ChevronRight size={14} className="text-[var(--text-muted)]" />
        </Link>
      </GlassPanel>

      {/* Version */}
      <div className="text-center pt-2 pb-8">
        <p className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
          AIRWATCH WEB v1.0.0
        </p>
      </div>
    </div>
  );
}
