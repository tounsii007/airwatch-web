'use client';

import { ReactNode, useState } from 'react';
import { AircraftPhoto } from '@/components/flight/details/AircraftPhoto';
import { DesktopHeader } from '@/components/flight/details/DesktopHeader';
import { FleetInfoCard } from '@/components/flight/details/FleetInfoCard';
import { RouteSection } from '@/components/flight/details/RouteSection';
import { RouteStatsBadge } from '@/components/flight/details/RouteStatsBadge';
import { AircraftFlightDetailsCard } from '@/components/flight/details/cards/AircraftFlightDetailsCard';
import { CarbonFootprintCard } from '@/components/flight/details/cards/CarbonFootprintCard';
import { DestinationWeatherCard } from '@/components/flight/details/cards/DestinationWeatherCard';
import { StatusCard } from '@/components/flight/details/cards/StatusCard';
import { PhotoGallery } from '@/components/flight/PhotoGallery';
import { PredictionCard } from '@/components/flight/PredictionCard';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { Plane } from 'lucide-react';
import type { AircraftState, AltitudeUnit, AppLanguage, FlightRouteInfo, SpeedUnit } from '@/lib/types';
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

/**
 * Slim cyan→mint route progress bar with a plane marker + elapsed/remaining,
 * derived from the scheduled departure + arrival times. Renders nothing until
 * both are known and form a valid interval (so ground/unknown flights stay clean).
 */
function FlightProgress({ routeInfo }: { routeInfo?: FlightRouteInfo | null }) {
  if (!routeInfo?.scheduledDep || !routeInfo?.scheduledArr) return null;
  const dep = new Date(routeInfo.scheduledDep).getTime();
  const arr = new Date(routeInfo.scheduledArr).getTime();
  if (!Number.isFinite(dep) || !Number.isFinite(arr) || arr <= dep) return null;
  const now = Date.now();
  const pct = Math.max(0, Math.min(1, (now - dep) / (arr - dep)));
  const elapsedMin = Math.max(0, Math.min(Math.round((arr - dep) / 60000), Math.round((now - dep) / 60000)));
  const remainMin = Math.max(0, Math.round((arr - now) / 60000));
  const fmt = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
  return (
    <div className="mt-3">
      <div className="relative h-1.5 rounded-full bg-[var(--surface-light)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct * 100}%`,
            background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
          }}
        />
        <Plane
          size={12}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 text-[var(--primary-bright)]"
          style={{ left: `${pct * 100}%`, filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.7))' }}
        />
      </div>
      <div className="mt-1.5 flex justify-between t-meta t-data text-[var(--text-muted)]">
        <span>{fmt(elapsedMin)} <span className="opacity-60">elapsed</span></span>
        <span>{fmt(remainMin)} <span className="opacity-60">left</span></span>
      </div>
    </div>
  );
}

/** Desktop right-side layout for the flight details panel. */
export function DesktopDetailsPanel({ aircraft, viewModel, language, altitudeUnit, speedUnit, altColor, actions, copied, onShare }: Props) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const showPhotos = useSettingsStore((s) => s.showAircraftPhotos);

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

      {/* Hero aircraft photo — promoted above the route to match the
          premium flight-card layout. Gated by the showAircraftPhotos setting. */}
      {showPhotos && viewModel.photoUrl && (
        <AircraftPhoto
          photoUrl={viewModel.photoUrl}
          registration={viewModel.metadata?.registration}
          onExpand={() => setGalleryOpen(true)}
        />
      )}

      <div className="p-4 border-b border-[var(--glass-border)]">
        <RouteSection
          depIata={viewModel.depIata} depCity={viewModel.depCity} depCountry={viewModel.depCountry} depCode={viewModel.depCode}
          arrIata={viewModel.arrIata} arrCity={viewModel.arrCity} arrCountry={viewModel.arrCountry} arrCode={viewModel.arrCode}
          compact={false} isLoading={false}
        />
        <RouteStatsBadge depIata={viewModel.depIata} arrIata={viewModel.arrIata} language={language} />
        <FlightProgress routeInfo={viewModel.routeInfo} />
      </div>

      {/* Detail cards — each its own inset section sharing the panel's p-4
          border rhythm. Order: destination weather → aircraft & flight
          details (with fleet + prediction enrichment beneath) → status →
          carbon footprint. The cards subsume the former standalone
          MetadataSection, DesktopStats and Co2Footer renders. */}
      <section className="p-4 border-b border-[var(--glass-border)]">
        <DestinationWeatherCard arrIata={viewModel.arrIata} language={language} />
      </section>

      <section className="p-4 border-b border-[var(--glass-border)]">
        <AircraftFlightDetailsCard
          aircraft={aircraft}
          viewModel={viewModel}
          language={language}
          altitudeUnit={altitudeUnit}
          speedUnit={speedUnit}
          altColor={altColor}
        />
      </section>

      {/* Fleet + prediction sit beneath the AIRCRAFT card: the basic
          "what is this plane" identity renders first, then the
          network-backed enrichment fades in below it. Both render their
          own full-bleed px-4/border-b strip, so they stay top-level
          siblings rather than nesting inside the padded card section. */}
      <FleetInfoCard icao24={aircraft.icao24} language={language} />
      <PredictionCard aircraft={aircraft} />

      <section className="p-4 border-b border-[var(--glass-border)]">
        <StatusCard routeInfo={viewModel.routeInfo} flightStatus={aircraft.flightStatus} language={language} />
      </section>

      <section className="p-4 border-b border-[var(--glass-border)]">
        <CarbonFootprintCard language={language} co2Estimate={viewModel.co2Estimate} copied={copied} onShare={onShare} />
      </section>

      {/* Photos are gated by the user's `showAircraftPhotos` setting — see
          Settings → Map → Aircraft photos. The hero photo above and this
          gallery modal share the same gate so a privacy-conscious user never
          pulls an upstream image. */}
      {showPhotos && galleryOpen && (
        <PhotoGallery icao24={aircraft.icao24} onClose={() => setGalleryOpen(false)} />
      )}
    </div>
  );
}
