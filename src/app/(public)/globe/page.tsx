'use client';

import dynamic from 'next/dynamic';
import { LoadingRadar } from '@/components/ui/LoadingRadar';

const GlobeView = dynamic(
  () => import('@/components/globe/GlobeView').then((m) => m.GlobeView),
  {
    ssr: false,
    loading: () => (
      <LoadingRadar
        size={96}
        label="3D GLOBE"
        hint="Loading CesiumJS"
        className="h-full bg-[var(--bg)]"
      />
    ),
  }
);

export default function GlobePage() {
  return <GlobeView />;
}
