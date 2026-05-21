'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { ZoomIn, ZoomOut, Locate, CloudRain, Info, Package } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { CONFIG } from '@/lib/constants';
import { useWeatherRadar } from '@/lib/hooks/useWeatherRadar';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { MAP_STYLES } from '@/components/map/mapStyles';
import { MapStylePicker } from '@/components/map/MapStylePicker';
import { MapApiErrorBanner } from '@/components/map/MapApiErrorBanner';
import { CountUp } from '@/components/ui';
import { IconButton } from '@/components/ui/IconButton';
import { Tag } from '@/components/ui/Tag';
import { t } from '@/lib/i18n/translations';
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
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-3 pointer-events-none animate-fade-in">
        <span className="gradient-text font-[var(--font-heading)] font-bold tracking-[0.2em] text-lg animate-neon-flicker">
          AIRWATCH
        </span>
        <span
          className="animate-fade-in"
          style={{ animationDelay: '120ms' }}
          title={transport === 'websocket' ? 'WebSocket push' : transport === 'polling' ? 'HTTP polling' : ''}
        >
          <Tag variant="success" size="sm" dot>
            LIVE{transport === 'websocket' ? ' · WS' : ''}
          </Tag>
        </span>
      </div>

      <div
        className="absolute top-3 right-3 z-[1000] glass-panel px-3 py-1.5 pointer-events-none animate-fade-in rounded-lg"
        style={{ animationDelay: '60ms' }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center gap-2">
          {isLoading && (
            <div
              className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse-glow"
              aria-hidden="true"
            />
          )}
          {flightError && (
            <div
              className="w-2 h-2 rounded-full bg-[var(--error)]"
              aria-hidden="true"
            />
          )}
          <span className="text-[var(--text-primary)] text-xs font-[var(--font-heading)] tracking-wider tabular">
            <CountUp value={aircraftMap.size} />{' '}
            <span className="text-[var(--text-muted)]">{t('flights_upper', language)}</span>
          </span>
        </div>
      </div>

      {/* API error banner — copy + tone mapping lives in MapApiErrorBanner. */}
      <MapApiErrorBanner error={flightError} language={language} />

      <div
        className="absolute top-16 right-3 z-[1000] flex flex-col gap-1.5 animate-fade-in"
        style={{ animationDelay: '180ms' }}
        role="toolbar"
        aria-label="Map controls"
      >
        <IconButton
          aria-label="Zoom in"
          onClick={handleZoomIn}
          variant="solid"
          size="md"
          className="glass-panel"
        >
          <ZoomIn size={18} className="text-[var(--primary)]" aria-hidden="true" />
        </IconButton>
        <IconButton
          aria-label="Zoom out"
          onClick={handleZoomOut}
          variant="solid"
          size="md"
          className="glass-panel"
        >
          <ZoomOut size={18} className="text-[var(--primary)]" aria-hidden="true" />
        </IconButton>
        <IconButton
          aria-label="Reset view to default location"
          onClick={handleCenter}
          variant="solid"
          size="md"
          className="glass-panel"
        >
          <Locate size={18} className="text-[var(--primary)]" aria-hidden="true" />
        </IconButton>
        <IconButton
          aria-label={showRadar ? 'Hide weather radar' : 'Show weather radar'}
          onClick={() => setShowRadar(!showRadar)}
          variant="solid"
          size="md"
          active={showRadar}
          className={`glass-panel ${showRadar ? '!bg-[var(--info)]/15 !border-[var(--info)]/30' : ''}`}
        >
          <CloudRain
            size={18}
            className={showRadar && !radarShouldShow ? 'text-[var(--info)] opacity-40' : showRadar ? 'text-[var(--info)]' : 'text-[var(--primary)]'}
            aria-hidden="true"
          />
        </IconButton>
        <IconButton
          aria-label={cargoOnly ? t('cargo_only_off', language) : t('cargo_only_on', language)}
          title={cargoOnly ? t('cargo_only_off', language) : t('cargo_only_on', language)}
          onClick={() => setCargoOnly(!cargoOnly)}
          variant="solid"
          size="md"
          active={cargoOnly}
          className={`glass-panel ${cargoOnly ? '!bg-[var(--accent)]/15 !border-[var(--accent)]/30' : ''}`}
        >
          <Package size={18} className={cargoOnly ? 'text-[var(--accent)]' : 'text-[var(--primary)]'} aria-hidden="true" />
        </IconButton>
        <MapStylePicker mapStyle={mapStyle} onChange={setMapStyle} />
        <IconButton
          aria-label={showLegend ? 'Hide legend' : 'Show legend'}
          onClick={() => setShowLegend((v) => !v)}
          variant="solid"
          size="md"
          active={showLegend}
          className={`glass-panel lg:hidden ${showLegend ? '!bg-[var(--primary)]/15' : ''}`}
        >
          <Info size={18} className="text-[var(--primary)]" aria-hidden="true" />
        </IconButton>
      </div>

      {/* Legend — always on desktop, toggle on mobile */}
      {showLegend && (
        <div className="absolute bottom-14 lg:bottom-4 right-3 z-[1000] glass-panel px-3 py-2">
          <div className="flex flex-col gap-1.5 text-[9px] font-[var(--font-heading)] tracking-wider">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STYLES[mapStyle].colors.low }} /> LOW &lt;10k ft</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STYLES[mapStyle].colors.med }} /> MED 10-30k ft</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STYLES[mapStyle].colors.high }} /> HIGH &gt;30k ft</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: MAP_STYLES[mapStyle].colors.ground }} /> GROUND</div>
          </div>
        </div>
      )}

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
