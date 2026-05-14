'use client';

import { useEffect, useRef, useState } from 'react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { MAP_STYLES } from '@/components/map/mapStyles';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// CesiumJS must be loaded dynamically — it does not support SSR
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Cesium: any = null;

export function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const startPolling = useFlightStore((s) => s.startPolling);
  const selectedAircraft = useFlightStore((s) => s.selectedAircraft);
  const mapStyle = useSettingsStore((s) => s.mapStyle);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (aircraftMap.size === 0) startPolling(); }, [aircraftMap.size, startPolling]);

  // Initialize Cesium viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    let cancelled = false;

    // A SyntaxError emitted while the Cesium chunk is being PARSED becomes a
    // window-level 'error' event, not a promise rejection — so the try/catch
    // around `await import('cesium')` never sees it and the user is left
    // staring at a blank black panel. Surface those too.
    const onChunkError = (e: ErrorEvent) => {
      if (cancelled) return;
      const src = (e.filename ?? '').toString();
      if (src.includes('/_next/') || src.includes('cesium')) {
        setError(`CesiumJS konnte nicht geladen werden: ${e.message}`);
      }
    };
    window.addEventListener('error', onChunkError);

    async function initCesium() {
      try {
        Cesium = await import('cesium');
        // Cesium fetches its workers / WASM / textures from CESIUM_BASE_URL.
        // We mirror the asset tree at build time (see scripts/copy-cesium-
        // assets.mjs) so it's served same-origin from /cesium/ — never hits
        // cesium.com directly. Browser Network tab stays clean and CSP can
        // drop cesium.com from script-src/connect-src/worker-src/img-src.
        (window as unknown as Record<string, string>).CESIUM_BASE_URL = '/cesium/';

        if (cancelled || !containerRef.current) return;

        const viewer = new Cesium.Viewer(containerRef.current, {
          imageryProvider: new Cesium.UrlTemplateImageryProvider({
            // Direct CARTO CDN — Cesium has its own per-host pool so
            // hammering one cartocdn host (no {s} round-robin in the
            // template) is fine. The nginx /tiles/* proxy was removed
            // along with the Leaflet basemap migration; see
            // src/components/map/mapStyles.ts header for the rationale.
            url: 'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
            maximumLevel: 18,
            credit: new Cesium.Credit('CARTO'),
          }),
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          animation: false,
          fullscreenButton: false,
          navigationHelpButton: false,
          infoBox: false,
          creditContainer: document.createElement('div'), // hide credits
        });

        viewer.scene.globe.enableLighting = false;
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0A1628');

        // Set initial camera position (Europe)
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(9.0, 48.5, 5_000_000),
        });

        viewerRef.current = viewer;
        setLoaded(true);
      } catch (err) {
        console.error('[Globe] CesiumJS failed to load:', err);
        setError('CesiumJS konnte nicht geladen werden');
      }
    }

    initCesium();
    return () => {
      cancelled = true;
      window.removeEventListener('error', onChunkError);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

  // Keep the Cesium canvas in sync with its container. Cesium reads the
  // size once inside `new Viewer(container, ...)` and never re-measures
  // on its own — so any subsequent layout change (devtools toggle, late
  // hydration, parent resize, phone rotation) leaves a stretched / shrunken
  // canvas painting only a sub-rectangle of the visible area. The fix is
  // a ResizeObserver that pipes the new size into `viewer.resize()`,
  // which recomputes the canvas + projection matrix. Also fire one
  // synchronous resize on first attach to swallow the very common
  // "container grew between init and paint" race.
  useEffect(() => {
    if (!loaded || !containerRef.current) return;
    const safeResize = () => {
      const v = viewerRef.current;
      if (v && !v.isDestroyed()) v.resize();
    };
    safeResize();
    const ro = new ResizeObserver(safeResize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [loaded]);

  // Update aircraft entities
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !Cesium || !loaded) return;

    viewer.entities.removeAll();
    const colors = MAP_STYLES[mapStyle].colors;

    let count = 0;
    aircraftMap.forEach((ac) => {
      if (count >= 800) return;
      if (!ac.latitude || !ac.longitude) return;
      count++;

      const alt = (ac.baroAltitude ?? 0) * 10; // exaggerate altitude for visibility
      const feet = (ac.baroAltitude ?? 0) * 3.28084;
      const colorHex = ac.onGround ? colors.ground
        : feet < 10000 ? colors.low
        : feet < 30000 ? colors.med
        : colors.high;

      viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(ac.longitude, ac.latitude, alt),
        point: {
          pixelSize: selectedAircraft?.icao24 === ac.icao24 ? 10 : 5,
          color: Cesium.Color.fromCssColorString(colorHex),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: selectedAircraft?.icao24 === ac.icao24 ? 2 : 0,
        },
        label: ac.callsign && (selectedAircraft?.icao24 === ac.icao24) ? {
          text: ac.callsign,
          font: '12px Orbitron',
          fillColor: Cesium.Color.fromCssColorString('#E0F0FF'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -10),
        } : undefined,
        properties: new Cesium.PropertyBag({ icao24: ac.icao24 }),
      });
    });
  }, [aircraftMap, mapStyle, selectedAircraft, loaded]);

  // Fly to selected aircraft
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !Cesium || !selectedAircraft?.latitude || !selectedAircraft?.longitude) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedAircraft.longitude,
        selectedAircraft.latitude,
        (selectedAircraft.baroAltitude ?? 10000) * 20 + 50000,
      ),
      duration: 1.5,
    });
    // Intentionally only re-fly on selection CHANGE (icao24), not on every
    // position update — otherwise the camera would chase the aircraft and
    // wouldn't let the user pan/zoom freely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAircraft?.icao24]);

  return (
    <div className="relative w-full h-full bg-[var(--bg)]">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-10">
        <Link href="/" className="glass-panel px-3 py-1.5 flex items-center gap-1.5 text-[var(--primary)] text-sm hover:bg-white/10">
          <ArrowLeft size={14} /> MAP
        </Link>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 glass-panel px-3 py-1.5">
        <span className="text-xs font-[var(--font-heading)] text-[var(--text-secondary)]">
          {aircraftMap.size.toLocaleString()} FLIGHTS
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[var(--error)] font-[var(--font-body)]">{error}</p>
        </div>
      )}

      {/* Cesium container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
