'use client';

import { ArrowLeft, Star } from 'lucide-react';
import { NeonText } from '@/components/ui/NeonText';
import { FlagImage } from '@/components/common/FlagImage';
import { t } from '@/lib/i18n/translations';
import { localizeCity } from '@/lib/data/city-translations';
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
      type="button"
      onClick={() => window.history.back()}
      className="inline-flex items-center gap-1.5 text-[var(--primary)] text-sm font-[var(--font-body)] hover:underline cursor-pointer"
    >
      <ArrowLeft size={16} aria-hidden />
      <span>{t('back', language)}</span>
    </button>
  );
}

function FavoriteButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save airport'}
      className="p-2 rounded-xl hover:bg-[var(--primary)]/10 transition-colors active:scale-95"
    >
      <Star size={22} className={saved ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
    </button>
  );
}

/** Back button + IATA heading + favorite star. Mirrors AirlineHeader for visual parity. */
export function AirportHeader({ iata, airport, language, saved, onToggleFavorite }: Props) {
  return (
    <>
      <BackLink language={language} />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3 min-w-0">
          {airport?.country && (
            <FlagImage
              code={airport.country}
              width={28}
              height={20}
              className="rounded-sm shadow shrink-0"
            />
          )}
          <div className="min-w-0">
            <NeonText text={iata} size="text-2xl" />
            <p className="text-sm text-[var(--text-secondary)] font-[var(--font-body)] mt-0.5 truncate">
              {airport?.name ? localizeCity(airport.name, language) : t('loading', language)}
            </p>
          </div>
        </div>
        <FavoriteButton saved={saved} onToggle={onToggleFavorite} />
      </div>
    </>
  );
}
