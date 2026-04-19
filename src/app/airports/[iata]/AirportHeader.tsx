'use client';

import Image from 'next/image';
import { ArrowLeft, Star } from 'lucide-react';
import { NeonText } from '@/components/ui/NeonText';
import { t } from '@/lib/i18n/translations';
import type { AirportEntry, AppLanguage } from '@/lib/types';

interface Props {
  iata: string;
  airport: AirportEntry | null;
  language: AppLanguage;
  saved: boolean;
  onToggleFavorite: () => void;
}

function BackLink({ language }: { language: AppLanguage }) {
  return (
    <button
      onClick={() => window.history.back()}
      className="inline-flex items-center gap-1.5 text-[var(--primary)] text-sm font-[var(--font-body)] hover:underline cursor-pointer"
    >
      <ArrowLeft size={16} />
      <span>{t('back', language)}</span>
    </button>
  );
}

function FavoriteButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="p-2 rounded-xl hover:bg-[var(--primary)]/10 transition-colors">
      <Star size={22} className={saved ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
    </button>
  );
}

/** Sticky-free back button + IATA heading + favorite star. */
export function AirportHeader({ iata, airport, language, saved, onToggleFavorite }: Props) {
  return (
    <>
      <BackLink language={language} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {airport?.country && (
            <Image src={`/flags/${airport.country}.svg`} alt={airport.country} width={28} height={20} className="rounded-sm shadow" />
          )}
          <div>
            <NeonText text={iata} size="text-2xl" />
            <p className="text-sm text-[var(--text-secondary)] font-[var(--font-body)] mt-0.5">
              {airport?.name || t('loading', language)}
            </p>
          </div>
        </div>
        <FavoriteButton saved={saved} onToggle={onToggleFavorite} />
      </div>
    </>
  );
}
