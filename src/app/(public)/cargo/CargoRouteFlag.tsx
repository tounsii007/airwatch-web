'use client';

/* eslint-disable @next/next/no-img-element */
import { airportCountry } from '@/lib/data/airports';

function hideOnError(e: React.SyntheticEvent<HTMLImageElement>) {
  (e.target as HTMLImageElement).style.display = 'none';
}

/** Tiny country flag next to an airport IATA code, hides if the flag file is missing. */
export function CargoRouteFlag({ iata }: { iata: string }) {
  const country = airportCountry(iata);
  if (!country) return null;
  return (
    <img
      src={`/flags/${country.toLowerCase()}.svg`}
      alt=""
      width={16}
      height={12}
      loading="lazy"
      decoding="async"
      className="w-4 h-3 rounded-sm object-cover shrink-0"
      onError={hideOnError}
    />
  );
}
