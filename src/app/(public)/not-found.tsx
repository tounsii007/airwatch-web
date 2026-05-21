'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

/**
 * Custom 404 — branded version of Next.js's default white page.
 * Now a client component so the body text obeys the active locale.
 * Next.js still returns the proper HTTP 404 status for the route
 * (`not-found.tsx` routing semantics don't require server rendering).
 */
export default function NotFound() {
  const language = useSettingsStore((s) => s.language);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
      <div className="relative">
        <span className="neon-text font-[var(--font-heading)] font-bold tracking-wider text-7xl text-[var(--primary)] block animate-brand-pulse">
          404
        </span>
        <span className="absolute left-0 right-0 -bottom-2 text-[10px] font-[var(--font-heading)] tracking-[0.4em] text-[var(--text-muted)] text-center">
          {t('off_radar', language)}
        </span>
      </div>
      <p className="text-[var(--text-secondary)] text-sm max-w-md font-[var(--font-body)] mt-8">
        {t('not_found_body', language)}
      </p>
      <Link href="/">
        <Button variant="primary" size="md" leadingIcon={<ArrowLeft size={14} />}>
          {t('back_to_map_btn', language)}
        </Button>
      </Link>
    </div>
  );
}
