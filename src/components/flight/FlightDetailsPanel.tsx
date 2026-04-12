'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Star, Navigation, Gauge, ArrowUpDown, Plane, RefreshCw, ChevronUp, ChevronDown, Leaf, Share2, Check, AlertTriangle } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { t } from '@/lib/i18n/translations';
import { formatAltitude, formatSpeed, getAltitudeColor } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { AircraftMetadata, FlightRouteInfo } from '@/lib/types';
import { LogoImage } from '@/components/common/LogoImage';
import { ManagedImage } from '@/components/common/ManagedImage';
import { FlagImage } from '@/components/common/FlagImage';
import { fetchFlightDetails } from '@/components/flight/details/fetchFlightDetails';
import { DataCell, FlagAirport, MiniCell, Tag, TimesRow } from '@/components/flight/details/primitives';
import { useFlightDetailsViewModel } from '@/components/flight/details/useFlightDetailsViewModel';
import { getAirlineLogoUrl } from '@/lib/data/airlines';

interface DetailsState {
  metadata: AircraftMetadata | null;
  photoUrl: string | null;
  routeInfo: FlightRouteInfo | null;
  selectionKey: string | null;
}

const EMPTY_DETAILS: DetailsState = {
  selectionKey: null,
  routeInfo: null,
  metadata: null,
  photoUrl: null,
};

export function FlightDetailsPanel() {
  const selectedAircraft = useFlightStore((s) => s.selectedAircraft);
  const clearSelection = useFlightStore((s) => s.clearSelection);
  const altitudeUnit = useSettingsStore((s) => s.altitudeUnit);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const language = useSettingsStore((s) => s.language);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const favoriteItems = useFavoritesStore((s) => s.items);

  const [details, setDetails] = useState<DetailsState>(EMPTY_DETAILS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);
  const requestIdRef = useRef(0);

  const selectionKey = selectedAircraft ? `${selectedAircraft.icao24}:${selectedAircraft.callsign?.trim() ?? ''}` : null;

  useEffect(() => {
    if (!selectedAircraft || !selectionKey) return;

    const aircraft = selectedAircraft;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    async function loadDetails() {
      setRefreshStatus('idle');
      try {
        const nextDetails = await fetchFlightDetails(aircraft.icao24, aircraft.callsign, controller.signal);
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setDetails({ selectionKey, ...nextDetails });
          setRefreshStatus('success');
          setTimeout(() => setRefreshStatus('idle'), 2500);
        }
      } catch {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setDetails({ selectionKey, routeInfo: null, metadata: null, photoUrl: null });
          setRefreshStatus('error');
          setTimeout(() => setRefreshStatus('idle'), 4000);
        }
      }
    }

    void loadDetails();
    return () => controller.abort();
  }, [selectedAircraft, selectionKey]);

  const handleRefresh = useCallback(async () => {
    if (!selectedAircraft || !selectionKey || isRefreshing) return;

    const aircraft = selectedAircraft;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setIsRefreshing(true);
    setRefreshStatus('idle');

    try {
      const nextDetails = await fetchFlightDetails(aircraft.icao24, aircraft.callsign, controller.signal);
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        setDetails({ selectionKey, ...nextDetails });
        setRefreshStatus('success');
        setTimeout(() => setRefreshStatus('idle'), 2500);
      }
    } catch {
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        setRefreshStatus('error');
        setTimeout(() => setRefreshStatus('idle'), 4000);
      }
    } finally {
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing, selectedAircraft, selectionKey]);

  const activeDetails = details.selectionKey === selectionKey ? details : EMPTY_DETAILS;
  const isLoading = Boolean(selectedAircraft && details.selectionKey !== selectionKey);
  const viewModel = useFlightDetailsViewModel({
    details: {
      metadata: activeDetails.metadata,
      photoUrl: activeDetails.photoUrl,
      routeInfo: activeDetails.routeInfo,
    },
    language,
    selectedAircraft,
  });

  if (!selectedAircraft || !viewModel) return null;

  const { icao24, callsign, baroAltitude, onGround, velocity, trueTrack, verticalRate, flightStatus, squawk, originCountry } = selectedAircraft;
  const altColor = getAltitudeColor(baroAltitude, onGround);
  const isFav = favoriteItems.some((item) => item.id === icao24);
  const lat = selectedAircraft.latitude;
  const lon = selectedAircraft.longitude;

  const handleShare = async () => {
    const title = `${viewModel.displayCallsign ?? icao24} - AirWatch`;
    const route = viewModel.depIata && viewModel.arrIata ? `${viewModel.depIata} -> ${viewModel.arrIata}` : '';
    const text = `Tracking ${viewModel.displayCallsign ?? icao24}${route ? ` (${route})` : ''} live on AirWatch`;
    const url = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // Cancelled by the user.
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard unavailable.
      }
    }
  };

  const headerButtons = (size: number) => (
    <div className="flex items-center gap-0.5 shrink-0">
      <button onClick={handleRefresh} className="p-1.5 rounded-lg hover:bg-white/5 relative">
        {refreshStatus === 'success' ? (
          <Check size={size} className="text-[var(--success)]" />
        ) : refreshStatus === 'error' ? (
          <AlertTriangle size={size} className="text-[var(--error)]" />
        ) : (
          <RefreshCw size={size} className={`text-[var(--primary)] ${isRefreshing ? 'animate-spin' : ''}`} />
        )}
      </button>
      <button
        onClick={() => toggleFavorite({
          id: icao24, type: 'flight', label: callsign ?? icao24, addedAt: Date.now(),
          subtitle: viewModel.airlineInfo?.name,
          airlineName: viewModel.airlineInfo?.name,
          airlineIata: viewModel.airlineIata,
          depIata: viewModel.depIata,
          arrIata: viewModel.arrIata,
          originCountry: originCountry,
        })}
        className="p-1.5 rounded-lg hover:bg-white/5"
      >
        <Star size={size} className={isFav ? 'text-[var(--accent)] fill-[var(--accent)]' : 'text-[var(--text-muted)]'} />
      </button>
      <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-white/5"><X size={size} className="text-[var(--text-muted)]" /></button>
    </div>
  );

  const routeSection = (compact: boolean) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-3 gap-2">
          <div className="w-3 h-3 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="text-[var(--text-muted)] text-[10px]">Loading...</span>
        </div>
      );
    }

    const flagSize = compact ? 'w-4 h-3' : 'w-5 h-4';

    return (
      <div className="flex items-center gap-2">
        <FlagAirport iata={viewModel.depIata} city={viewModel.depCity} country={viewModel.depCountry} color="var(--success)" compact={compact} />
        <div className="flex-1 flex items-center gap-1 px-1">
          {viewModel.depCode && <FlagImage code={viewModel.depCode} width={compact ? 16 : 20} height={compact ? 12 : 14} className="rounded-sm object-cover shadow-sm shrink-0" />}
          <div className="flex-1 h-px bg-gradient-to-r from-[var(--success)] to-[var(--primary)]" />
          <Plane size={compact ? 10 : 14} className="text-[var(--primary)] -rotate-90 shrink-0" />
          <div className="flex-1 h-px bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
          {viewModel.arrCode && <FlagImage code={viewModel.arrCode} width={compact ? 16 : 20} height={compact ? 12 : 14} className="rounded-sm object-cover shadow-sm shrink-0" />}
        </div>
        <FlagAirport iata={viewModel.arrIata} city={viewModel.arrCity} country={viewModel.arrCountry} color="var(--accent)" compact={compact} />
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[1100] bg-black/40 lg:hidden" onClick={clearSelection} />

      <div className="fixed z-[1200] bottom-0 left-0 right-0 lg:top-12 lg:bottom-0 lg:left-auto lg:right-0 lg:w-[420px] animate-slide-up lg:animate-none">
        <div className="lg:hidden glass-panel rounded-t-2xl md:rounded-t-3xl max-h-[75vh] md:max-h-[80vh] overflow-y-auto pb-16">
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-[var(--text-muted)]/40" />
          </div>
          <div className="p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {viewModel.airlineIata ? (
                  <div className="relative w-16 h-8 bg-white rounded-md shrink-0 shadow-sm overflow-hidden flex items-center justify-center px-1">
                    <LogoImage src={getAirlineLogoUrl(viewModel.airlineIata, 'lg')} alt="" fill sizes="64px" className="object-contain px-1" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-md bg-[var(--surface-light)] flex items-center justify-center shrink-0 border border-[var(--glass-border)]">
                    <Plane size={16} className="text-[var(--primary)]" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-[var(--font-heading)] font-bold text-sm tracking-wider text-[var(--primary)]">{viewModel.displayCallsign ?? icao24}</span>
                    <StatusBadge status={flightStatus} />
                  </div>
                  {viewModel.airlineInfo && <span className="text-[9px] text-[var(--text-muted)] truncate block">{viewModel.airlineInfo.name}</span>}
                </div>
              </div>
              {viewModel.photoUrl && (
                <div className="relative w-14 h-10 rounded overflow-hidden shrink-0 mx-1">
                  <ManagedImage src={viewModel.photoUrl} alt="" fill sizes="56px" unoptimized className="object-cover" />
                </div>
              )}
              {headerButtons(12)}
            </div>
            {routeSection(true)}
            {/* Compact times + photo row */}
            {(viewModel.routeInfo?.scheduledDep || viewModel.photoUrl) && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--glass-border)]">
                {viewModel.routeInfo?.scheduledDep ? (
                  <div className="flex items-center gap-3 text-[10px] font-[var(--font-body)]">
                    <span className="text-[var(--text-muted)]">{t('dep', language)} <span className="text-[var(--text-primary)] font-bold">{viewModel.routeInfo.scheduledDep.slice(11, 16) ?? '--:--'}</span></span>
                    {viewModel.routeInfo.scheduledArr && (
                      <span className="text-[var(--text-muted)]">{t('arr', language)} <span className="text-[var(--text-primary)] font-bold">{viewModel.routeInfo.scheduledArr.slice(11, 16) ?? '--:--'}</span></span>
                    )}
                    {(viewModel.routeInfo.depDelayed ?? 0) > 0 && (
                      <span className="text-[var(--error)] text-[9px] font-bold">+{viewModel.routeInfo.depDelayed}min</span>
                    )}
                  </div>
                ) : <div />}
                {viewModel.photoUrl && (
                  <div className="relative w-16 h-10 rounded overflow-hidden shrink-0">
                    <ManagedImage src={viewModel.photoUrl} alt="" fill sizes="64px" unoptimized className="object-cover" />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-[var(--glass-border)]">
              <MiniCell label={t('alt_label', language)} value={formatAltitude(baroAltitude, altitudeUnit)} color={altColor} />
              <MiniCell label={t('spd_label', language)} value={formatSpeed(velocity, speedUnit)} />
              <MiniCell label={t('hdg_label', language)} value={trueTrack != null ? `${Math.round(trueTrack)}°` : '--'} />
              <button onClick={() => setShowMore(!showMore)} className="glass-panel px-2 py-1.5 text-center hover:bg-white/5 cursor-pointer">
                <span className="text-[8px] font-[var(--font-heading)] text-[var(--primary)] tracking-wider block">{showMore ? t('less_label', language) : t('more_label', language)}</span>
                {showMore ? <ChevronDown size={12} className="text-[var(--primary)] mx-auto" /> : <ChevronUp size={12} className="text-[var(--primary)] mx-auto" />}
              </button>
            </div>
          </div>
          {showMore && (
            <div className="border-t border-[var(--glass-border)]">
              {viewModel.routeInfo?.scheduledDep && <TimesRow routeInfo={viewModel.routeInfo} flightStatus={flightStatus} />}
              <div className="flex gap-2 p-3 border-b border-[var(--glass-border)]">
                {viewModel.photoUrl && (
                  <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0">
                    <ManagedImage src={viewModel.photoUrl} alt="" fill sizes="80px" unoptimized className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {viewModel.metadata && <>
                    <p className="text-xs font-[var(--font-body)] font-bold text-[var(--text-primary)] truncate">{viewModel.metadata.manufacturer} {viewModel.metadata.model}</p>
                    {viewModel.metadata.operatorName && <p className="text-[10px] text-[var(--text-secondary)] truncate">{t('operated_by', language)} {viewModel.metadata.operatorName}</p>}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {viewModel.metadata.registration && <Tag label="REG" value={viewModel.metadata.registration} />}
                      {viewModel.metadata.typecode && <Tag label="" value={viewModel.metadata.typecode} />}
                    </div>
                  </>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-3">
                <MiniCell label={t('vs_label', language)} value={verticalRate != null && verticalRate !== 0 ? `${verticalRate > 0 ? '+' : ''}${Math.round(verticalRate * 196.85)}` : '--'} color={verticalRate != null ? (verticalRate > 0.5 ? '#4ADE80' : verticalRate < -0.5 ? '#F87171' : undefined) : undefined} />
                <MiniCell label={t('lat_label', language)} value={lat?.toFixed(4) ?? '--'} />
                <MiniCell label={t('lon_label', language)} value={lon?.toFixed(4) ?? '--'} />
                {squawk && <MiniCell label={t('squawk_label', language)} value={squawk} highlight={['7700', '7600', '7500'].includes(squawk)} />}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block glass-panel rounded-l-2xl h-full overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)]">
            <div className="flex items-center gap-3">
              {viewModel.airlineIata ? (
                <div className="relative w-28 h-12 bg-white rounded-lg shrink-0 shadow-md overflow-hidden flex items-center justify-center px-2 py-1">
                  <LogoImage src={getAirlineLogoUrl(viewModel.airlineIata, 'lg')} alt="" fill sizes="112px" className="object-contain px-2 py-1" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[var(--surface-light)] flex items-center justify-center shrink-0 border border-[var(--glass-border)]">
                  <Plane size={24} className="text-[var(--primary)]" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="neon-text font-[var(--font-heading)] font-bold text-xl tracking-wider" style={{ color: 'var(--primary)' }}>{viewModel.displayCallsign ?? icao24}</h2>
                  {originCountry && <span className="text-[10px] font-[var(--font-heading)] px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">{originCountry}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[var(--text-muted)] text-xs">{icao24.toUpperCase()}</span>
                  <StatusBadge status={flightStatus} />
                  {viewModel.airlineInfo && <span className="text-[10px] text-[var(--text-secondary)]">{viewModel.airlineInfo.name}</span>}
                </div>
              </div>
            </div>
            {headerButtons(16)}
          </div>

          <div className="p-4 border-b border-[var(--glass-border)]">{routeSection(false)}</div>

          {viewModel.routeInfo?.scheduledDep && <TimesRow routeInfo={viewModel.routeInfo} flightStatus={flightStatus} />}

          {viewModel.metadata && (
            <div className="px-4 py-3 border-b border-[var(--glass-border)]">
              <div className="flex items-center gap-2 mb-2">
                <Plane size={14} className="text-[var(--primary)]" />
                <span className="text-sm font-[var(--font-body)] font-bold text-[var(--text-primary)]">{viewModel.metadata.manufacturer} {viewModel.metadata.model}</span>
                {viewModel.metadata.typecode && <span className="text-[9px] font-[var(--font-heading)] px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">{viewModel.metadata.typecode}</span>}
              </div>
              {viewModel.metadata.operatorName && <p className="text-[var(--text-secondary)] text-xs">{t('operated_by', language)} {viewModel.metadata.operatorName}</p>}
              <div className="flex gap-2 mt-2 flex-wrap">
                {viewModel.metadata.registration && <Tag label="REG" value={viewModel.metadata.registration} />}
                {viewModel.metadata.typecode && <Tag label="TYPE" value={viewModel.metadata.typecode} />}
                <Tag label="ICAO24" value={icao24.toUpperCase()} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 p-4 border-b border-[var(--glass-border)]">
            <DataCell icon={<ArrowUpDown size={14} />} label={t('alt_label', language)} value={formatAltitude(baroAltitude, altitudeUnit)} color={altColor} />
            <DataCell icon={<Gauge size={14} />} label={t('spd_label', language)} value={formatSpeed(velocity, speedUnit)} color="var(--primary)" />
            <DataCell icon={<Navigation size={14} />} label={t('hdg_label', language)} value={trueTrack != null ? `${Math.round(trueTrack)}°` : '--'} />
            <DataCell icon={<ArrowUpDown size={14} />} label={t('vs_label', language)} value={verticalRate != null && verticalRate !== 0 ? `${verticalRate > 0 ? '+' : ''}${Math.round(verticalRate * 196.85)} fpm` : '--'} color={verticalRate != null ? (verticalRate > 0.5 ? '#4ADE80' : verticalRate < -0.5 ? '#F87171' : undefined) : undefined} />
          </div>

          <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-[var(--glass-border)]">
            <MiniCell label={t('lat_label', language)} value={lat?.toFixed(4) ?? '--'} color="#60A5FA" />
            <MiniCell label={t('lon_label', language)} value={lon?.toFixed(4) ?? '--'} color="#60A5FA" />
          </div>

          {squawk && <div className="px-4 py-2 border-b border-[var(--glass-border)] flex gap-2"><Tag label={t('squawk_label', language)} value={squawk} highlight={['7700', '7600', '7500'].includes(squawk)} /></div>}

          <div className="px-4 py-4 border-b border-[var(--glass-border)] flex items-center justify-between">
            {viewModel.co2Estimate ? (
              <div className="flex items-center gap-2">
                <Leaf size={14} className="text-[var(--success)]" />
                <div>
                  <span className="text-xs font-[var(--font-heading)] font-bold text-[var(--success)]">~{viewModel.co2Estimate.co2Kg} kg CO2</span>
                  <span className="text-[9px] text-[var(--text-muted)] ml-1.5">{viewModel.co2Estimate.distKm.toLocaleString()} km · {t('co2_per_pax', language)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Leaf size={12} className="text-[var(--text-muted)]" />
                <span className="text-[9px] text-[var(--text-muted)]">{t('co2_unavailable', language)}</span>
              </div>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer"
            >
              {copied ? <Check size={12} /> : <Share2 size={12} />}
              {copied ? t('copied', language) : t('share', language)}
            </button>
          </div>

          {viewModel.photoUrl && (
            <div className="p-4">
              <div className="relative rounded-xl overflow-hidden">
                <ManagedImage src={viewModel.photoUrl} alt="" width={368} height={160} unoptimized className="w-full h-40 object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <span className="text-[9px] text-white/70">planespotters.net</span>
                  {viewModel.metadata?.registration && <span className="float-right text-[9px] text-white/70 font-[var(--font-heading)]">{viewModel.metadata.registration}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
