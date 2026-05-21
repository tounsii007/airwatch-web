'use client';

import { ArrowLeft, Star } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Tag } from '@/components/ui/Tag';
import { NeonText } from '@/components/ui/NeonText';
import { FlagImage } from '@/components/common/FlagImage';
import { API } from '@/lib/constants';
import { t } from '@/lib/i18n/translations';
import { countryToCode } from '@/lib/data/country-translations';
import type { AppLanguage } from '@/lib/types';
import type { AirlineData } from '@/app/(public)/airlines/[icao]/airlineTypes';

interface Props {
  icao: string;
  airline: AirlineData | null;
  language: AppLanguage;
  mounted: boolean;
  saved: boolean;
  onBack: () => void;
  onToggleFavorite: () => void;
}

function Back({ language, onBack }: { language: AppLanguage; onBack: () => void }) {
  return (
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[var(--primary)] text-sm font-[var(--font-body)] hover:underline cursor-pointer">
      <ArrowLeft size={16} />
      <span>{t('back', language)}</span>
    </button>
  );
}

function CodeChips({ airline, icao }: { airline: AirlineData | null; icao: string }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {airline?.iata && (
        <Tag variant="info" size="sm">IATA: {airline.iata}</Tag>
      )}
      <Tag variant="default" size="sm">ICAO: {airline?.icao ?? icao}</Tag>
      {airline?.country && (
        <Tag variant="default" size="sm">{airline.country}</Tag>
      )}
    </div>
  );
}

function FavoriteButton({ mounted, saved, onToggle, language }: { mounted: boolean; saved: boolean; onToggle: () => void; language: AppLanguage }) {
  const cls = mounted && saved ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]';
  return (
    <button
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={t(saved ? 'remove_from_saved' : 'save_airline', language)}
      className="p-2 rounded-xl hover:bg-[var(--primary)]/10 transition-colors active:scale-95"
    >
      <Star size={22} className={cls} />
    </button>
  );
}

/** Back button + airline header (logo avatar + name + code chips + favorite star). */
export function AirlineHeader({ icao, airline, language, mounted, saved, onBack, onToggleFavorite }: Props) {
  const logoIata = airline?.iata || icao;
  const countryCode = airline?.country ? countryToCode(airline.country) : null;

  return (
    <>
      <Back language={language} onBack={onBack} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar handles logo → initials → plane icon fallback chain */}
          <Avatar
            src={API.airlineLogo(logoIata)}
            name={airline?.name ?? icao}
            alt={airline?.name ?? icao}
            size="xl"
            shape="squircle"
            className="bg-white/90 p-1 shadow-md shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <NeonText text={airline?.name ?? icao} size="text-lg" />
              {countryCode && (
                <FlagImage code={countryCode} className="w-5 h-4 rounded-sm shadow object-cover shrink-0" />
              )}
            </div>
            <CodeChips airline={airline} icao={icao} />
          </div>
        </div>
        <FavoriteButton mounted={mounted} saved={saved} onToggle={onToggleFavorite} language={language} />
      </div>
    </>
  );
}
