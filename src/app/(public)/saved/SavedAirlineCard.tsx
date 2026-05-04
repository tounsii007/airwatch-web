'use client';

import Link from 'next/link';
import { Building2, Pin, PinOff, X } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { AIRLINES, getAirlineLogoUrl } from '@/lib/data/airlines';
import type { AppLanguage, FavoriteItem } from '@/lib/types';
import { formatDate } from '@/app/(public)/saved/formatDate';

interface Props {
  item: FavoriteItem;
  language: AppLanguage;
  onRemove: () => void;
  onPin: () => void;
}

/** Saved-airline card with logo, IATA/ICAO and country. */
export function SavedAirlineCard({ item, language, onRemove, onPin }: Props) {
  // The favorite id format is `airline-<ICAO>`; fall back to the label itself.
  const icao = item.id.startsWith('airline-') ? item.id.slice(8) : item.label;
  const info = AIRLINES[icao] ?? AIRLINES[item.label];
  const iata = info?.iata;
  const name = info?.name ?? item.subtitle ?? icao;
  const country = info?.country;

  return (
    <GlassPanel className="p-3">
      <div className="flex items-center justify-between">
        <Link href={`/airlines/${icao}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          {iata ? (
            <div className="w-14 h-7 bg-white rounded shrink-0 shadow-sm overflow-hidden flex items-center justify-center px-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getAirlineLogoUrl(iata, 'sm')} alt={name}
                className="max-w-full max-h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
            </div>
          ) : (
            <Building2 size={20} className="text-[var(--accent)] shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">{name}</span>
              <span className="text-[8px] font-[var(--font-heading)] font-bold px-1 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                {t('airline', language)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-[var(--text-secondary)] font-[var(--font-body)]">
              {iata && <span>IATA: {iata}</span>}
              <span>ICAO: {icao}</span>
              {country && <span>· {country}</span>}
            </div>
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
