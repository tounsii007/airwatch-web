'use client';

import { useEffect } from 'react';
import { NeonText } from '@/components/ui/NeonText';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { AppearanceSection } from '@/app/settings/AppearanceSection';
import { IntervalSection } from '@/app/settings/IntervalSection';
import { MapSection } from '@/app/settings/MapSection';
import { MyStatsSection } from '@/app/settings/MyStatsSection';
import { UnitsSection } from '@/app/settings/UnitsSection';

function VersionFooter() {
  return (
    <div className="text-center pt-2 pb-8">
      <p className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">AIRWATCH WEB v1.0.0</p>
    </div>
  );
}

export default function SettingsPage() {
  const {
    theme, language, altitudeUnit, speedUnit, showTrails, showRadar, showLabels, updateInterval,
    setTheme, setLanguage, setAltitudeUnit, setSpeedUnit, setShowTrails, setShowRadar, setShowLabels, setUpdateInterval,
  } = useSettingsStore();

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('settings', language)} size="text-xl" />
      </div>
      <AppearanceSection theme={theme} language={language} onTheme={setTheme} onLanguage={setLanguage} />
      <UnitsSection
        altitudeUnit={altitudeUnit}
        speedUnit={speedUnit}
        language={language}
        onAltitude={setAltitudeUnit}
        onSpeed={setSpeedUnit}
      />
      <MapSection
        showTrails={showTrails}
        showRadar={showRadar}
        showLabels={showLabels}
        language={language}
        onTrails={setShowTrails}
        onRadar={setShowRadar}
        onLabels={setShowLabels}
      />
      <IntervalSection updateInterval={updateInterval} language={language} onChange={setUpdateInterval} />
      <MyStatsSection language={language} />
      <VersionFooter />
    </div>
  );
}
