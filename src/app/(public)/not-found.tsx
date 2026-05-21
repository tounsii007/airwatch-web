import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';

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
        <span className="neon-text font-[var(--font-heading)] font-bold tracking-wider text-7xl text-[var(--primary)] block animate-brand-pulse">
          404
        </span>
        <span className="absolute left-0 right-0 -bottom-2 text-[10px] font-[var(--font-heading)] tracking-[0.4em] text-[var(--text-muted)] text-center">
          OFF RADAR
        </span>
      </div>
      <p className="text-[var(--text-secondary)] text-sm max-w-md font-[var(--font-body)] mt-8">
        This route is not on any flight plan we know.
      </p>
      <Link href="/">
        <Button variant="primary" size="md" leadingIcon={<ArrowLeft size={14} />}>
          BACK TO MAP
        </Button>
      </Link>
    </div>
  );
}
