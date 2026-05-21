'use client';

import dynamic from 'next/dynamic';
import { LoadingRadar } from '@/components/ui/LoadingRadar';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

const GlobeView = dynamic(
  () => import('@/components/globe/GlobeView').then((m) => m.GlobeView),
  {
    ssr: false,
    loading: () => <GlobeLoadingFallback />,
  }
);

function GlobeLoadingFallback() {
  // Read the language at fallback-render time so the loader picks up the
  // active locale instead of always saying "Loading CesiumJS" in English.
  const language = useSettingsStore((s) => s.language);
  return (
    <LoadingRadar
      size={96}
      label={t('globe_title', language)}
      hint={t('globe_loading_hint', language)}
      className="h-full bg-[var(--bg)]"
    />
  );
}

export default function GlobePage() {
  return <GlobeView />;
}
