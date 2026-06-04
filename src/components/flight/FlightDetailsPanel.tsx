'use client';

import { useCallback } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { getAltitudeColor } from '@/lib/utils';
import { DesktopDetailsPanel } from '@/components/flight/details/DesktopDetailsPanel';
import { DetailsHeaderActions } from '@/components/flight/details/DetailsHeaderActions';
import { MobileDetailsPanel } from '@/components/flight/details/MobileDetailsPanel';
import { useFlightDetailsLoader } from '@/components/flight/details/useFlightDetailsLoader';
import { useFlightDetailsViewModel } from '@/components/flight/details/useFlightDetailsViewModel';
import { useShareFlight } from '@/components/flight/details/useShareFlight';
import type { AircraftState } from '@/lib/types';
import type { FlightDetailsVM } from '@/components/flight/details/useFlightDetailsViewModel';
import { favoriteId } from '@/lib/stores/favoriteId';

/** Builds a favorite-toggle payload from the current aircraft + view-model. */
function buildFavoritePayload(aircraft: AircraftState, vm: FlightDetailsVM) {
  return {
    id: favoriteId.flight(aircraft.icao24),
    type: 'flight' as const,
    label: aircraft.callsign ?? aircraft.icao24,
    addedAt: Date.now(),
    subtitle: vm.airlineInfo?.name,
    airlineName: vm.airlineInfo?.name,
    airlineIata: vm.airlineIata,
    depIata: vm.depIata,
    arrIata: vm.arrIata,
    originCountry: aircraft.originCountry,
  };
}

/**
 * Thin composer for the flight details panel. Owns no layout itself — delegates
 * to {@link MobileDetailsPanel} and {@link DesktopDetailsPanel}. Data + actions
 * come from dedicated hooks.
 */
export function FlightDetailsPanel() {
  const selectedAircraft = useFlightStore((s) => s.selectedAircraft);
  const clearSelection = useFlightStore((s) => s.clearSelection);
  const altitudeUnit = useSettingsStore((s) => s.altitudeUnit);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const language = useSettingsStore((s) => s.language);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteItems = useFavoritesStore((s) => s.items);

  const { details, isLoading, isRefreshing, refreshStatus, handleRefresh } = useFlightDetailsLoader(selectedAircraft);
  const viewModel = useFlightDetailsViewModel({ details, language, selectedAircraft });
  const { copied, share } = useShareFlight();

  const handleShare = useCallback(() => {
    if (!selectedAircraft || !viewModel) return;
    void share({
      icao24: selectedAircraft.icao24,
      callsign: viewModel.displayCallsign,
      depIata: viewModel.depIata,
      arrIata: viewModel.arrIata,
    });
  }, [selectedAircraft, viewModel, share]);

  const handleToggleFavorite = useCallback(() => {
    if (!selectedAircraft || !viewModel) return;
    toggleFavorite(buildFavoritePayload(selectedAircraft, viewModel));
  }, [selectedAircraft, viewModel, toggleFavorite]);

  if (!selectedAircraft || !viewModel) return null;

  const isFav = favoriteItems.some((item) => item.id === favoriteId.flight(selectedAircraft.icao24));
  const altColor = getAltitudeColor(selectedAircraft.baroAltitude, selectedAircraft.onGround);

  const actions = (size: number) => (
    <DetailsHeaderActions
      size={size}
      isRefreshing={isRefreshing}
      refreshStatus={refreshStatus}
      isFav={isFav}
      onRefresh={handleRefresh}
      onToggleFavorite={handleToggleFavorite}
      onClose={clearSelection}
    />
  );

  return (
    <>
      <div className="fixed inset-0 z-[1100] bg-black/40 lg:hidden" onClick={clearSelection} />
      <div className="fixed z-[1200] bottom-0 left-0 right-0 lg:top-14 lg:bottom-0 lg:left-auto lg:right-0 lg:w-[420px] animate-slide-up lg:animate-none">
        <MobileDetailsPanel
          aircraft={selectedAircraft}
          viewModel={viewModel}
          language={language}
          altitudeUnit={altitudeUnit}
          speedUnit={speedUnit}
          altColor={altColor}
          isLoading={isLoading}
          actions={actions(12)}
        />
        <DesktopDetailsPanel
          aircraft={selectedAircraft}
          viewModel={viewModel}
          language={language}
          altitudeUnit={altitudeUnit}
          speedUnit={speedUnit}
          altColor={altColor}
          actions={actions(16)}
          copied={copied}
          onShare={handleShare}
        />
      </div>
    </>
  );
}
