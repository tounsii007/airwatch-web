'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Binoculars, LayoutDashboard } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

function QuickLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link href={href} className="flex-1">
      <GlassPanel className="px-3 py-2.5 flex items-center gap-2 hover:bg-[var(--primary)]/10 transition-colors">
        {icon}
        <span className="text-[10px] font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-secondary)]">{label}</span>
      </GlassPanel>
    </Link>
  );
}

/** Quick-links row: dashboard + spotting. */
export function QuickLinks({ language }: { language: AppLanguage }) {
  return (
    <div className="flex gap-2">
      <QuickLink href="/dashboard" icon={<LayoutDashboard size={14} className="text-[var(--primary)]" />} label={t('dashboard', language)} />
      <QuickLink href="/spotting" icon={<Binoculars size={14} className="text-[var(--accent)]" />} label={t('spotting', language)} />
    </div>
  );
}
