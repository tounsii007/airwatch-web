'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useFlightStore } from '@/lib/stores/flightStore';
import { CONFIG } from '@/lib/constants';
import { useWeatherRadar } from '@/lib/hooks/useWeatherRadar';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { MapApiErrorBanner } from '@/components/map/MapApiErrorBanner';
import { MapBrandOverlay } from '@/components/map/MapBrandOverlay';
import { MapStatusOverlay } from '@/components/map/MapStatusOverlay';
import { MapLegend } from '@/components/map/MapLegend';
import { MapToolbar } from '@/components/map/MapToolbar';
import { useLeafletMap } from '@/components/map/hooks/useLeafletMap';
import { useBaseLayer } from '@/components/map/hooks/useBaseLayer';
import { useRadarOverlay } from '@/components/map/hooks/useRadarOverlay';
import { useRouteOverlay } from '@/components/map/hooks/useRouteOverlay';
import { useAircraftMarkers } from '@/components/map/hooks/useAircraftMarkers';
import { useAirportLabels } from '@/components/map/hooks/useAirportLabels';
import { useTurbulenceOverlay } from '@/components/map/hooks/useTurbulenceOverlay';
import { VoiceButton } from '@/components/voice/VoiceButton';

export function MapView() {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectedAircraft = useFlightStore((s) => s.selectedAircraft);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const clearSelection = useFlightStore((s) => s.clearSelection);
  const startPolling = useFlightStore((s) => s.startPolling);
  const stopPolling = useFlightStore((s) => s.stopPolling);
  const isLoading = useFlightStore((s) => s.isLoading);
  const flightError = useFlightStore((s) => s.error);
  const transport = useFlightStore((s) => s.transport);

  const showRadar = useSettingsStore((s) => s.showRadar);
  const showTrails = useSettingsStore((s) => s.showTrails);
  const showLabels = useSettingsStore((s) => s.showLabels);
  const showTurbulence = useSettingsStore((s) => s.showTurbulence);
  const showAirportWeather = useSettingsStore((s) => s.showAirportWeather);
  const cargoOnly = useSettingsStore((s) => s.cargoOnly);
  const setCargoOnly = useSettingsStore((s) => s.setCargoOnly);
  const setShowRadar = useSettingsStore((s) => s.setShowRadar);
  const mapStyle = useSettingsStore((s) => s.mapStyle);
  const setMapStyle = useSettingsStore((s) => s.setMapStyle);
  const language = useSettingsStore((s) => s.language);
  const updateInterval = useSettingsStore((s) => s.updateInterval);
  const radarTileUrl = useWeatherRadar();

  const { baseLayerRef, mapContainerRef, mapRef, zoom } = useLeafletMap(clearSelection);
  const routeLayerRef = useRouteOverlay({ selectedAircraft, showTrails });
  useTurbulenceOverlay({ enabled: showTurbulence, mapRef });
  const markersLayerRef = useAircraftMarkers({
    aircraftMap,
    mapRef,
    mapStyle,
    selectedAircraft,
    selectAircraft,
    showLabels,
    zoom,
    cargoOnly,
  });

  useBaseLayer({ baseLayerRef, mapRef, mapStyle });
  useAirportLabels({ mapRef, mapStyle, zoom, weatherEnabled: showAirportWeather });

  useEffect(() => {
    stopPolling();
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling, updateInterval]);

  const radarShouldShow = Boolean(showRadar && radarTileUrl && zoom <= 6);
  const [showLegend, setShowLegend] = useState(true); // default visible on desktop
  useRadarOverlay({ enabled: radarShouldShow, mapRef, tileUrl: radarTileUrl });

  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map) return;
    if (markersLayer && !map.hasLayer(markersLayer)) markersLayer.addTo(map);
    if (routeLayer && !map.hasLayer(routeLayer)) routeLayer.addTo(map);
  }, [mapRef, markersLayerRef, routeLayerRef]);

  // Re-measure on language change. GlobalEffects flips <html dir> when the
  // user switches between LTR and RTL locales (en/de/fr/es/it ↔ ar). The
  // page reflow can desynchronise Leaflet's container size from its
  // internal pane positions; without an explicit invalidateSize the bbox
  // filter in useAircraftMarkers reads stale bounds and rejects every
  // aircraft until the next zoom or pan event. Run on the next frame so
  // the browser has finished the dir-flip reflow before we read back the
  // new size.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    return () => cancelAnimationFrame(id);
  }, [mapRef, language]);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), [mapRef]);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), [mapRef]);
  const handleCenter = useCallback(() => {
    mapRef.current?.setView([CONFIG.defaultLat, CONFIG.defaultLon], 6);
  }, [mapRef]);

  // Auto-center ONLY on the first frame after a new aircraft is picked — not
  // on every subsequent position or zoom tick, or the user's mouse-wheel /
  // trackpad pinch fights a re-center on every tick.
  const centeredOnIcaoRef = useRef<string | null>(null);
  useEffect(() => {
    const ac = selectedAircraft;
    if (!ac) { centeredOnIcaoRef.current = null; return; }
    if (ac.latitude == null || ac.longitude == null || !mapRef.current) return;
    if (centeredOnIcaoRef.current === ac.icao24) return;
    centeredOnIcaoRef.current = ac.icao24;
    const currentZoom = mapRef.current.getZoom();
    const targetZoom = Math.min(Math.max(currentZoom, 8), 12);
    mapRef.current.setView([ac.latitude, ac.longitude], targetZoom, { animate: true });
  }, [mapRef, selectedAircraft]);

  // ── Deep-link consumer: /?icao24=ABC123 selects that aircraft on load ────
  // Used by the geofence /alerts panel to "Show on map" — clicking an
  // alert navigates here with the icao24 query param, and we hand off to
  // selectAircraft once the polling/WS feed has the aircraft in the map.
  //
  // The ref guards against repeated selection across renders: once we've
  // honoured the URL hint we don't keep re-asserting it (so the user can
  // click around freely without the URL param yanking the selection back).
  const consumedDeepLinkRef = useRef(false);
  useEffect(() => {
    if (consumedDeepLinkRef.current) return;
    if (typeof window === 'undefined') return;
    const target = new URLSearchParams(window.location.search).get('icao24')?.trim().toLowerCase();
    if (!target) { consumedDeepLinkRef.current = true; return; }
    const ac = aircraftMap.get(target);
    if (!ac) return; // Aircraft hasn't arrived in the feed yet — wait for next tick.
    consumedDeepLinkRef.current = true;
    selectAircraft(ac);
  }, [aircraftMap, selectAircraft]);

  return (
    /* Sizing strategy:
       * h-full grabs height from the parent (page.tsx wraps us in
         `fixed top-0 left-0 right-0 bottom-0 lg:pt-12` which gives a
         well-measured content area).
       * h-dvh fallback for the rare layouts where a different page
         drops MapView without forwarding height. dvh follows the
         mobile address-bar collapse so the map doesn't shrink when
         the toolbar hides on iOS Safari scroll.
       * Tile-pane sizing bugs ("map only renders in bottom half") are
         caught by the ResizeObserver in useLeafletMap which fires
         map.invalidateSize() on every container size change. */
    <div className="relative w-full h-full h-dvh">
      <MapBrandOverlay transport={transport} />
      <MapStatusOverlay
        count={aircraftMap.size}
        isLoading={isLoading}
        hasError={Boolean(flightError)}
        language={language}
      />

      {/* API error banner — copy + tone mapping lives in MapApiErrorBanner. */}
      <MapApiErrorBanner error={flightError} language={language} />

      <MapToolbar
        language={language}
        mapStyle={mapStyle}
        onMapStyle={setMapStyle}
        showRadar={showRadar}
        radarShouldShow={radarShouldShow}
        onToggleRadar={() => setShowRadar(!showRadar)}
        cargoOnly={cargoOnly}
        onToggleCargo={() => setCargoOnly(!cargoOnly)}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend((v) => !v)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenter={handleCenter}
      />

      {/* Legend — always on desktop, toggle on mobile */}
      {showLegend && <MapLegend mapStyle={mapStyle} />}

      <VoiceButton />

      {/*
        dir="ltr" pins the Leaflet container's directionality regardless of
        what <html dir> looks like. Without this, switching the app to Arabic
        (RTL) flips the page direction, which reflows the body and a few
        absolute-positioned panes inside .leaflet-container — the cached
        bounds in useAircraftMarkers's bbox filter then clip every aircraft
        out of the visible set. The map itself is always cartesian and not a
        candidate for RTL layout, so isolating it is correct, not a hack.
      */}
      <div ref={mapContainerRef} dir="ltr" className="absolute inset-0" />
    </div>
  );
}
