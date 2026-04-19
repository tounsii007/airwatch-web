'use client';

import dynamic from 'next/dynamic';

// Everything here needs `window`, `navigator.mediaDevices`, and
// `DeviceOrientationEvent` — disable SSR entirely.
const ArView = dynamic(() => import('@/app/ar/ArView').then((m) => m.ArView), { ssr: false });

export default function ArPage() {
  return <ArView />;
}
