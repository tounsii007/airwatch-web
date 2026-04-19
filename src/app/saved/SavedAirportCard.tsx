'use client';

import Link from 'next/link';
import { MapPin, Pin, PinOff, X } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { airportCity, airportCountry } from '@/lib/data/airports';
import type { AppLanguage, FavoriteItem } from '@/lib/types';
import { formatDate } from '@/app/saved/formatDate';

interface Props {
  item: FavoriteItem;
  language: AppLanguage;
  onRemove: () => void;
  onPin: () => void;
}

/** Saved-airport card with flag, IATA and city. */
export function SavedAirportCard({ item, language, onRemove, onPin }: Props) {
  const iata = item.label;
  const country = airportCountry(iata);
  const city = airportCity(iata);

  return (
    <GlassPanel className="p-3">
      <div className="flex items-center justify-between">
        <Link href={`/airports/${iata}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="relative shrink-0">
            {country ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/flags/${country.toLowerCase()}.svg`} alt=""
                className="w-8 h-6 rounded-sm object-cover shadow-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <MapPin size={20} className="text-[var(--info)]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-[var(--font-heading)] text-base font-bold text-[var(--primary)]">{iata}</span>
              <span className="text-[8px] font-[var(--font-heading)] font-bold px-1 py-0.5 rounded bg-[var(--info)]/10 text-[var(--info)]">
                {t('airport', language)}
              </span>
            </div>
            {item.subtitle && (
              <p className="text-[10px] text-[var(--text-primary)] font-[var(--font-body)] truncate font-medium">
                {item.subtitle}
              </p>
            )}
            {city && <p className="text-[9px] text-[var(--text-secondary)] font-[var(--font-body)]">{city}</p>}
          </div>
        </Link>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onPin} className="p-1.5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors">
            {item.pinned
              ? <Pin size={13} className="text-[var(--warning)] fill-[var(--warning)]" />
              : <PinOff size={13} className="text-[var(--text-muted)]" />}
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>
      <p className="text-[8px] text-[var(--text-muted)] font-[var(--font-body)] mt-1.5">
        {t('saved_on', language)} {formatDate(item.addedAt, language)}
      </p>
    </GlassPanel>
  );
}
