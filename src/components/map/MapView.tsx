'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { ZoomIn, ZoomOut, Locate, CloudRain, Info } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { CONFIG } from '@/lib/constants';
import { useWeatherRadar } from '@/lib/hooks/useWeatherRadar';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { MAP_STYLES } from '@/components/map/mapStyles';
import { MapStylePicker } from '@/components/map/MapStylePicker';
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
  });

  useBaseLayer({ baseLayerRef, mapRef, mapStyle });
  useAirportLabels({ mapRef, mapStyle, zoom });

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
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-3 pointer-events-none">
        <span className="neon-text font-[var(--font-heading)] font-bold tracking-wider text-lg text-[var(--primary)]">
          AIRWATCH
        </span>
        <span className="text-[var(--success)] text-xs font-[var(--font-heading)] flex items-center gap-1" title={transport === 'websocket' ? 'WebSocket push' : transport === 'polling' ? 'HTTP polling' : ''}>
          <span className="animate-pulse-glow">●</span> LIVE{transport === 'websocket' ? ' · WS' : ''}
        </span>
      </div>

      <div className="absolute top-3 right-3 z-[1000] glass-panel px-3 py-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          {isLoading && <div className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse-glow" />}
          {flightError && <div className="w-2 h-2 rounded-full bg-[var(--error)]" />}
          <span className="text-[var(--text-secondary)] text-xs font-[var(--font-heading)] tracking-wider">
            {aircraftMap.size.toLocaleString()} {t('flights_upper', language)}
          </span>
        </div>
      </div>

      {/* API error banner */}
      {flightError && (
        <div className="absolute top-12 left-3 right-3 z-[999] glass-panel border border-[var(--error)]/40 bg-[var(--error)]/8 px-3 py-2 pointer-events-none">
          <p className="text-[10px] font-[var(--font-heading)] font-bold text-[var(--error)] tracking-wider">
            {flightError.includes('month_limit') ? t('api_limit_reached', language)
              : flightError === 'network_error' ? t('api_network_error', language)
              : flightError.includes('proxy') ? t('api_proxy_error', language)
              : flightError === 'rate_limited' ? t('api_rate_limited', language)
              : t('api_error', language)}
          </p>
          <p className="text-[9px] font-[var(--font-body)] text-[var(--text-secondary)] mt-0.5">
            {flightError.includes('month_limit') ? t('api_limit_hint', language)
              : flightError === 'network_error' ? t('api_network_hint', language)
              : flightError.includes('proxy') ? t('api_proxy_hint', language)
              : flightError === 'rate_limited' ? t('api_rate_hint', language)
              : t('api_error_hint', language)}
          </p>
        </div>
      )}

      <div className="absolute top-16 right-3 z-[1000] flex flex-col gap-1.5">
        <button onClick={handleZoomIn} className="glass-panel p-2 hover:bg-white/10 transition-colors cursor-pointer">
          <ZoomIn size={18} className="text-[var(--primary)]" />
        </button>
        <button onClick={handleZoomOut} className="glass-panel p-2 hover:bg-white/10 transition-colors cursor-pointer">
          <ZoomOut size={18} className="text-[var(--primary)]" />
        </button>
        <button onClick={handleCenter} className="glass-panel p-2 hover:bg-white/10 transition-colors cursor-pointer">
          <Locate size={18} className="text-[var(--primary)]" />
        </button>
        <button onClick={() => setShowRadar(!showRadar)} className={`glass-panel p-2 hover:bg-white/10 transition-colors cursor-pointer ${showRadar ? 'bg-[var(--info)]/15 border-[var(--info)]/30' : ''}`}>
          <CloudRain size={18} className={showRadar && !radarShouldShow ? 'text-[var(--info)] opacity-40' : showRadar ? 'text-[var(--info)]' : 'text-[var(--primary)]'} />
        </button>
        <MapStylePicker mapStyle={mapStyle} onChange={setMapStyle} />
        <button onClick={() => setShowLegend((v) => !v)} className={`glass-panel p-2 hover:bg-white/10 transition-colors cursor-pointer lg:hidden ${showLegend ? 'bg-[var(--primary)]/15' : ''}`}>
          <Info size={18} className="text-[var(--primary)]" />
        </button>
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

      <div ref={mapContainerRef} className="absolute inset-0" />
    </div>
  );
}
