'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import { AppearanceSection } from '@/app/(public)/settings/AppearanceSection';
import { IntervalSection } from '@/app/(public)/settings/IntervalSection';
import { MapSection } from '@/app/(public)/settings/MapSection';
import { MyStatsSection } from '@/app/(public)/settings/MyStatsSection';
import { NotificationsSection } from '@/app/(public)/settings/NotificationsSection';
import { UnitsSection } from '@/app/(public)/settings/UnitsSection';
import { PageContainer, FadeIn } from '@/components/ui';

function VersionFooter({ language }: { language: AppLanguage }) {
  return (
    <div className="text-center pt-4 pb-2 space-y-1">
      <p className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest">
        AIRWATCH WEB v1.0.0
      </p>
      <Link
        href="/privacy"
        className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest underline hover:text-[var(--primary)]"
      >
        {t('privacy_title', language)}
      </Link>
    </div>
  );
}

export default function SettingsPage() {
  const {
    theme, language, altitudeUnit, speedUnit,
    showTrails, showRadar, showLabels, showAircraftPhotos, showAirportWeather,
    updateInterval,
    setTheme, setLanguage, setAltitudeUnit, setSpeedUnit,
    setShowTrails, setShowRadar, setShowLabels, setShowAircraftPhotos, setShowAirportWeather,
    setUpdateInterval,
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
            showAircraftPhotos={showAircraftPhotos}
            showAirportWeather={showAirportWeather}
            language={language}
            onTrails={setShowTrails}
            onRadar={setShowRadar}
            onLabels={setShowLabels}
            onAircraftPhotos={setShowAircraftPhotos}
            onAirportWeather={setShowAirportWeather}
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
          <NotificationsSection language={language} />
        </FadeIn>
        <FadeIn delay={300}>
          <MyStatsSection language={language} />
        </FadeIn>
        <FadeIn delay={360}>
          <VersionFooter language={language} />
        </FadeIn>
      </div>
    </PageContainer>
  );
}
