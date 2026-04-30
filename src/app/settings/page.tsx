'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { AppearanceSection } from '@/app/settings/AppearanceSection';
import { IntervalSection } from '@/app/settings/IntervalSection';
import { MapSection } from '@/app/settings/MapSection';
import { MyStatsSection } from '@/app/settings/MyStatsSection';
import { UnitsSection } from '@/app/settings/UnitsSection';
import { PageContainer, FadeIn } from '@/components/ui';

function VersionFooter() {
  return (
    <div className="text-center pt-4 pb-2">
      <p className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
        AIRWATCH WEB v1.0.0
      </p>
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
    <PageContainer maxWidth="2xl" title={t('settings', language)}>
      <div className="space-y-4">
        <FadeIn>
          <AppearanceSection
            theme={theme}
            language={language}
            onTheme={setTheme}
            onLanguage={setLanguage}
          />
        </FadeIn>
        <FadeIn delay={60}>
          <UnitsSection
            altitudeUnit={altitudeUnit}
            speedUnit={speedUnit}
            language={language}
            onAltitude={setAltitudeUnit}
            onSpeed={setSpeedUnit}
          />
        </FadeIn>
        <FadeIn delay={120}>
          <MapSection
            showTrails={showTrails}
            showRadar={showRadar}
            showLabels={showLabels}
            language={language}
            onTrails={setShowTrails}
            onRadar={setShowRadar}
            onLabels={setShowLabels}
          />
        </FadeIn>
        <FadeIn delay={180}>
          <IntervalSection
            updateInterval={updateInterval}
            language={language}
            onChange={setUpdateInterval}
          />
        </FadeIn>
        <FadeIn delay={240}>
          <MyStatsSection language={language} />
        </FadeIn>
        <FadeIn delay={300}>
          <VersionFooter />
        </FadeIn>
      </div>
    </PageContainer>
  );
}
