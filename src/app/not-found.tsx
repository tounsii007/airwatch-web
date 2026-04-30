import Link from 'next/link';
import type { Metadata } from 'next';

/**
 * Custom 404 — branded version of Next.js's default white page.
 * Server-rendered (no 'use client') so it can be returned with the
 * proper HTTP 404 status without a client roundtrip.
 */
export const metadata: Metadata = {
  title: 'AirWatch — Page not found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="relative">
        <span className="neon-text font-[var(--font-heading)] font-bold tracking-wider text-7xl text-[var(--primary)] block">
          404
        </span>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-[var(--font-heading)] tracking-[0.4em] text-[var(--text-muted)] -bottom-6">
          OFF RADAR
        </span>
      </div>
      <p className="text-[var(--text-secondary)] text-sm max-w-md font-[var(--font-body)] mt-8">
        This route is not on any flight plan we know.
      </p>
      <Link
        href="/"
        className="glass-panel px-6 py-2 mt-2 hover:bg-white/10 transition-colors text-sm font-[var(--font-heading)] tracking-wider text-[var(--primary)]"
      >
        BACK TO MAP
      </Link>
    </div>
  );
}
