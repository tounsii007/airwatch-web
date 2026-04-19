'use client';

import dynamic from 'next/dynamic';

const GlobeView = dynamic(
  () => import('@/components/globe/GlobeView').then((m) => m.GlobeView),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--primary)]/20" />
          <div className="absolute inset-0 rounded-full animate-radar origin-center"
            style={{ background: 'conic-gradient(from 0deg, transparent 0deg, var(--primary) 30deg, transparent 60deg)', opacity: 0.3 }} />
        </div>
        <span className="neon-text font-[var(--font-heading)] font-bold text-xl text-[var(--primary)]">3D GLOBE</span>
        <p className="text-[var(--text-muted)] text-xs animate-pulse">Loading CesiumJS...</p>
      </div>
    ),
  }
);

export default function GlobePage() {
  return <GlobeView />;
}
