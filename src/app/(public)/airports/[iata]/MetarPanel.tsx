'use client';

/**
 * METAR + TAF panel for the airport detail page.
 *
 * <h3>Why two payloads behind one panel</h3>
 * METAR is "right now" (one observation, ≤ 1h old). TAF is "the next
 * 24 h" (a list of forecast windows). Operators reading the airport
 * page want both side-by-side. We render them as tabs to keep the
 * primary surface uncluttered; the active tab is sticky per-session
 * so an operator who always wants TAF first only clicks once.
 *
 * <h3>Loading + error states</h3>
 * Both endpoints fail-soft via the api proxy (503 / 502 on upstream
 * outage). When METAR is unavailable we still render the panel header
 * and a one-liner — the operator sees the placeholder rather than
 * wondering why the section is missing.
 */
import { useEffect, useState } from 'react';
import { Cloud, FileText } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { decodeMetar, decodeTaf, phenomenonText, type DecodedMetar, type DecodedTaf } from '@/lib/utils/metarDecode';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  /** ICAO code (4 letters, e.g. EDDF). When empty/missing, the panel
   *  doesn't render — the airport entry didn't carry one. */
  icao: string | null;
  language: AppLanguage;
}

interface MetarPayload { rawOb: string }
interface TafPayload   { rawTAF: string }

type Mode = 'metar' | 'taf';

export function MetarPanel({ icao, language }: Props) {
  const [metarRaw, setMetarRaw] = useState<string | null>(null);
  const [tafRaw, setTafRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'metar';
    return (localStorage.getItem('airwatch.metar.mode') as Mode) || 'metar';
  });

  useEffect(() => {
    if (!icao) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/proxy/metar/${icao}`, { cache: 'no-store' }),
      fetch(`/api/proxy/taf/${icao}`,   { cache: 'no-store' }),
    ])
      .then(async ([m, ta]) => {
        if (cancelled) return;
        if (m.ok) {
          const payload: MetarPayload[] = await m.json().catch(() => []);
          setMetarRaw(payload[0]?.rawOb ?? null);
        }
        if (ta.ok) {
          const payload: TafPayload[] = await ta.json().catch(() => []);
          setTafRaw(payload[0]?.rawTAF ?? null);
        }
        if (!m.ok && !ta.ok) setError('upstream-unavailable');
      })
      .catch(() => { if (!cancelled) setError('network'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [icao]);

  if (!icao) return null;

  const decodedMetar: DecodedMetar | null = metarRaw ? decodeMetar(metarRaw) : null;
  const decodedTaf:   DecodedTaf   | null = tafRaw   ? decodeTaf(tafRaw)     : null;

  function selectMode(next: Mode) {
    setMode(next);
    try { localStorage.setItem('airwatch.metar.mode', next); } catch { /* private mode */ }
  }

  return (
    <GlassPanel className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud size={14} className="text-[var(--primary)]" />
          <span className="text-xs font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">
            {t('metar_taf', language)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{icao}</span>
        </div>
        <div className="flex gap-1">
          <ModeTab active={mode === 'metar'} onClick={() => selectMode('metar')}>METAR</ModeTab>
          <ModeTab active={mode === 'taf'}   onClick={() => selectMode('taf')}>TAF</ModeTab>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-muted)]">{t('loading', language)}…</p>
      ) : error && !metarRaw && !tafRaw ? (
        <p className="text-xs text-[var(--text-muted)]">{t('metar_unavailable', language)}</p>
      ) : mode === 'metar' ? (
        <MetarBody decoded={decodedMetar} language={language} />
      ) : (
        <TafBody decoded={decodedTaf} language={language} />
      )}
    </GlassPanel>
  );
}

function ModeTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2 py-0.5 text-[10px] font-[var(--font-heading)] tracking-wide rounded
                  transition-colors ${
                    active
                      ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
    >
      {children}
    </button>
  );
}

function MetarBody({ decoded, language }: { decoded: DecodedMetar | null; language: AppLanguage }) {
  if (!decoded) return <p className="text-xs text-[var(--text-muted)]">{t('metar_unavailable', language)}</p>;
  return (
    <div className="space-y-2">
      {decoded.observed && (
        <div className="text-[10px] text-[var(--text-muted)]">
          {t('observed_at', language)}: {decoded.observed}
          {decoded.modifier && <span className="ml-2 px-1 py-0.5 bg-[var(--text-muted)]/15 rounded">{decoded.modifier}</span>}
        </div>
      )}
      <DecodedRows decoded={decoded} />
      <details className="mt-2">
        <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer flex items-center gap-1">
          <FileText size={10} /> {t('metar_raw', language)}
        </summary>
        <pre className="mt-1 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--sunken)] p-2 rounded overflow-x-auto">
          {decoded.raw}
        </pre>
      </details>
    </div>
  );
}

function TafBody({ decoded, language }: { decoded: DecodedTaf | null; language: AppLanguage }) {
  if (!decoded) return <p className="text-xs text-[var(--text-muted)]">{t('taf_unavailable', language)}</p>;
  return (
    <div className="space-y-2">
      {decoded.issued && (
        <div className="text-[10px] text-[var(--text-muted)]">
          {t('issued_at', language)}: {decoded.issued} · {t('valid', language)}: {decoded.validFrom}/{decoded.validTo}
        </div>
      )}
      <ul className="space-y-1.5">
        {decoded.windows.map((w, i) => (
          <li key={i} className="border-l-2 border-[var(--primary)]/30 pl-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] font-[var(--font-heading)] text-[var(--primary)]">{w.label}</span>
              {w.when && <span className="text-[10px] font-mono text-[var(--text-muted)]">{w.when}</span>}
            </div>
            <DecodedRows decoded={w.conditions} compact />
          </li>
        ))}
      </ul>
      <details className="mt-2">
        <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer flex items-center gap-1">
          <FileText size={10} /> {t('taf_raw', language)}
        </summary>
        <pre className="mt-1 text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--sunken)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
          {decoded.raw}
        </pre>
      </details>
    </div>
  );
}

function DecodedRows({ decoded, compact }: { decoded: DecodedMetar; compact?: boolean }) {
  const cls = compact ? 'text-[10px]' : 'text-xs';
  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-1 ${cls}`}>
      {decoded.wind && (
        <Row label="Wind" value={
          decoded.wind.variable ? 'Variable / Calm'
            : `${decoded.wind.direction}° at ${decoded.wind.speed}${decoded.wind.unit}` +
              (decoded.wind.gust ? ` (gust ${decoded.wind.gust})` : '')
        } />
      )}
      {decoded.visibility && (
        <Row label="Vis." value={`${decoded.visibility.value}${decoded.visibility.unit === 'CAVOK' ? '' : ' ' + decoded.visibility.unit}`} />
      )}
      {decoded.temperature.tempC !== null && (
        <Row label="Temp" value={`${decoded.temperature.tempC}°C / dp ${decoded.temperature.dewC}°C`} />
      )}
      {(decoded.altimeter.hPa !== null || decoded.altimeter.inHg !== null) && (
        <Row label="QNH" value={
          decoded.altimeter.hPa !== null
            ? `${decoded.altimeter.hPa} hPa`
            : `${decoded.altimeter.inHg} inHg`
        } />
      )}
      {decoded.cloudLayers.length > 0 && (
        <Row label="Cloud" value={
          decoded.cloudLayers
            .map((l) => l.cover === 'CAVOK' || l.cover === 'CLR' || l.cover === 'SKC'
              ? l.cover
              : `${l.cover} ${l.baseFt} ft${l.type ? ' ' + l.type : ''}`)
            .join(' · ')
        } />
      )}
      {decoded.phenomena.length > 0 && (
        <Row label="WX" value={decoded.phenomena.map(phenomenonText).join(', ')} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="text-[var(--text-muted)] font-[var(--font-heading)] tracking-wide">{label}</span>
      <span className="text-[var(--text-secondary)]">{value}</span>
    </>
  );
}
