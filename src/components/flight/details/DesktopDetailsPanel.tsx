'use client';

import { ReactNode, useState } from 'react';
import { AircraftPhoto } from '@/components/flight/details/AircraftPhoto';
import { Co2Footer } from '@/components/flight/details/Co2Footer';
import { DesktopHeader } from '@/components/flight/details/DesktopHeader';
import { DesktopStats } from '@/components/flight/details/DesktopStats';
import { MetadataSection } from '@/components/flight/details/MetadataSection';
import { RouteSection } from '@/components/flight/details/RouteSection';
import { TimesRow } from '@/components/flight/details/primitives';
import { PhotoGallery } from '@/components/flight/PhotoGallery';
import { PredictionCard } from '@/components/flight/PredictionCard';
import type { AircraftState, AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';
import type { FlightDetailsVM } from '@/components/flight/details/useFlightDetailsViewModel';

interface Props {
  aircraft: AircraftState;
  viewModel: FlightDetailsVM;
  language: AppLanguage;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  altColor?: string;
  actions: ReactNode;
  copied: boolean;
  onShare: () => void;
}

/** Desktop right-side layout for the flight details panel. */
export function DesktopDetailsPanel({ aircraft, viewModel, language, altitudeUnit, speedUnit, altColor, actions, copied, onShare }: Props) {
  const [galleryOpen, setGalleryOpen] = useState(false);

  return (
    <div className="hidden lg:block glass-panel rounded-l-2xl h-full overflow-y-auto">
      <DesktopHeader
        airlineIata={viewModel.airlineIata}
        airlineName={viewModel.airlineInfo?.name}
        displayCallsign={viewModel.displayCallsign ?? aircraft.icao24}
        icao24={aircraft.icao24}
        flightStatus={aircraft.flightStatus}
        originCountry={aircraft.originCountry}
        actions={actions}
      />

      <div className="p-4 border-b border-[var(--glass-border)]">
        <RouteSection
          depIata={viewModel.depIata} depCity={viewModel.depCity} depCountry={viewModel.depCountry} depCode={viewModel.depCode}
          arrIata={viewModel.arrIata} arrCity={viewModel.arrCity} arrCountry={viewModel.arrCountry} arrCode={viewModel.arrCode}
          compact={false} isLoading={false}
        />
      </div>

      {viewModel.routeInfo?.scheduledDep && <TimesRow routeInfo={viewModel.routeInfo} flightStatus={aircraft.flightStatus} />}

      {viewModel.metadata && <MetadataSection metadata={viewModel.metadata} icao24={aircraft.icao24} language={language} />}

      <PredictionCard aircraft={aircraft} />

      <DesktopStats language={language} altitudeUnit={altitudeUnit} speedUnit={speedUnit} aircraft={aircraft} altColor={altColor} />

      <Co2Footer language={language} co2Estimate={viewModel.co2Estimate} copied={copied} onShare={onShare} />

      {viewModel.photoUrl && (
        <AircraftPhoto
          photoUrl={viewModel.photoUrl}
          registration={viewModel.metadata?.registration}
          onExpand={() => setGalleryOpen(true)}
        />
      )}

      {galleryOpen && (
        <PhotoGallery icao24={aircraft.icao24} onClose={() => setGalleryOpen(false)} />
      )}
    </div>
  );
}
