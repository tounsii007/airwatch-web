'use client';

import { MockEmergenciesPanel } from '@/components/debug/MockEmergenciesPanel';

/**
 * Dev-only UI surface. Renders `null` in production builds so nothing is
 * shipped to real users. Next.js inlines `process.env.NODE_ENV` at build
 * time, so this collapses away cleanly without runtime cost.
 */
export function DevTools() {
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <>
      <MockEmergenciesPanel />
    </>
  );
}
