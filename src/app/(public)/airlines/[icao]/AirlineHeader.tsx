'use client';

import Image from 'next/image';
import { ArrowLeft, Star } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
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

function Logo({ icao, airline }: { icao: string; airline: AirlineData | null }) {
  const logoIata = airline?.iata || icao;
  return (
    <GlassPanel className="p-2 bg-white/90 rounded-xl">
      <Image src={API.airlineLogo(logoIata)} alt={airline?.name ?? icao} width={60} height={24} className="object-contain" unoptimized />
    </GlassPanel>
  );
}

function CodeChips({ airline, icao }: { airline: AirlineData | null; icao: string }) {
  return (
    <div className="flex gap-1.5 mt-1">
      {airline?.iata && (
        <span className="text-[9px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-[var(--primary)]/15 text-[var(--primary)]">
          IATA: {airline.iata}
        </span>
      )}
      <span className="text-[9px] font-[var(--font-heading)] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">
        ICAO: {airline?.icao ?? icao}
      </span>
    </div>
  );
}

function NameBlock({ airline, icao }: { airline: AirlineData | null; icao: string }) {
  const code = airline?.country ? countryToCode(airline.country) : null;
  return (
    <div>
      <div className="flex items-center gap-2">
        <NeonText text={airline?.name ?? icao} size="text-lg" />
        {code && <FlagImage code={code} className="w-5 h-4 rounded-sm shadow object-cover" />}
      </div>
      <CodeChips airline={airline} icao={icao} />
    </div>
  );
}

function FavoriteButton({ mounted, saved, onToggle }: { mounted: boolean; saved: boolean; onToggle: () => void }) {
  const className = mounted && saved ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]';
  return (
    <button onClick={onToggle} className="p-2 rounded-xl hover:bg-[var(--primary)]/10 transition-colors">
      <Star size={22} className={className} />
    </button>
  );
}

/** Back button + airline header (logo + name + code chips + favorite star). */
export function AirlineHeader({ icao, airline, language, mounted, saved, onBack, onToggleFavorite }: Props) {
  return (
    <>
      <Back language={language} onBack={onBack} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo icao={icao} airline={airline} />
          <NameBlock airline={airline} icao={icao} />
        </div>
        <FavoriteButton mounted={mounted} saved={saved} onToggle={onToggleFavorite} />
      </div>
    </>
  );
}
