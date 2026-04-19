'use client';

import { ReactNode, useState } from 'react';
import { CompactTimesRow } from '@/components/flight/details/CompactTimesRow';
import { MobileHeader } from '@/components/flight/details/MobileHeader';
import { MobileMoreSection } from '@/components/flight/details/MobileMoreSection';
import { MobileStatsGrid } from '@/components/flight/details/MobileStatsGrid';
import { RouteSection } from '@/components/flight/details/RouteSection';
import type { AircraftState, AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';
import type { FlightDetailsVM } from '@/components/flight/details/useFlightDetailsViewModel';

interface Props {
  aircraft: AircraftState;
  viewModel: FlightDetailsVM;
  language: AppLanguage;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  altColor?: string;
  isLoading: boolean;
  actions: ReactNode;
}

function DragHandle() {
  return (
    <div className="flex justify-center pt-2 pb-1">
      <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]/40" />
    </div>
  );
}

/** Mobile bottom-sheet layout for the flight details panel. */
export function MobileDetailsPanel({ aircraft, viewModel, language, altitudeUnit, speedUnit, altColor, isLoading, actions }: Props) {
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="lg:hidden glass-panel rounded-t-2xl md:rounded-t-3xl max-h-[75vh] md:max-h-[80vh] overflow-y-auto pb-16">
      <DragHandle />
      <div className="p-3 md:p-4">
        <MobileHeader
          airlineIata={viewModel.airlineIata}
          airlineName={viewModel.airlineInfo?.name}
          displayCallsign={viewModel.displayCallsign ?? aircraft.icao24}
          flightStatus={aircraft.flightStatus}
          photoUrl={viewModel.photoUrl}
          actions={actions}
        />
        <RouteSection
          depIata={viewModel.depIata} depCity={viewModel.depCity} depCountry={viewModel.depCountry} depCode={viewModel.depCode}
          arrIata={viewModel.arrIata} arrCity={viewModel.arrCity} arrCountry={viewModel.arrCountry} arrCode={viewModel.arrCode}
          compact isLoading={isLoading}
        />
        <CompactTimesRow language={language} routeInfo={viewModel.routeInfo} photoUrl={viewModel.photoUrl} />
        <MobileStatsGrid
          language={language}
          altitudeUnit={altitudeUnit}
          speedUnit={speedUnit}
          baroAltitude={aircraft.baroAltitude}
          velocity={aircraft.velocity}
          trueTrack={aircraft.trueTrack}
          altColor={altColor}
          showMore={showMore}
          onToggleMore={() => setShowMore((v) => !v)}
        />
      </div>
      {showMore && (
        <MobileMoreSection
          language={language}
          selectedAircraft={aircraft}
          metadata={viewModel.metadata}
          photoUrl={viewModel.photoUrl}
          routeInfo={viewModel.routeInfo}
          flightStatus={aircraft.flightStatus}
        />
      )}
    </div>
  );
}
