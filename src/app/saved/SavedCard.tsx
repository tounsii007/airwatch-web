'use client';

import { SavedAirlineCard } from '@/app/saved/SavedAirlineCard';
import { SavedAirportCard } from '@/app/saved/SavedAirportCard';
import { SavedFlightCard } from '@/app/saved/SavedFlightCard';
import type { AircraftState, AltitudeUnit, AppLanguage, FavoriteItem, SpeedUnit } from '@/lib/types';

export interface SavedCardProps {
  item: FavoriteItem;
  liveData: AircraftState | undefined;
  language: AppLanguage;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  onRemove: () => void;
  onPin: () => void;
  onTrack: () => void;
}

/** Thin dispatcher that renders the right saved-card variant for an item. */
export function SavedCard({ item, liveData, language, altitudeUnit, speedUnit, onRemove, onPin, onTrack }: SavedCardProps) {
  switch (item.type) {
    case 'flight':
      return (
        <SavedFlightCard
          item={item}
          liveData={liveData}
          language={language}
          altitudeUnit={altitudeUnit}
          speedUnit={speedUnit}
          onRemove={onRemove}
          onPin={onPin}
          onTrack={onTrack}
        />
      );
    case 'airport':
      return <SavedAirportCard item={item} language={language} onRemove={onRemove} onPin={onPin} />;
    case 'airline':
      return <SavedAirlineCard item={item} language={language} onRemove={onRemove} onPin={onPin} />;
  }
}
