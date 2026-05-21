'use client';

/**
 * NOTAM (Notice to Airmen) panel for the airport detail page.
 *
 * <h3>What's a NOTAM</h3>
 * A short notice issued by an authority about anything affecting
 * flight ops at an airport — runway closures, navaid outages,
 * obstacles, restricted airspace, fuel availability, etc. Each
 * carries an issued/expires window and a Q-code that classifies
 * the subject.
 *
 * <h3>Source upstream</h3>
 * The default upstream is aviationweather.gov (US-only). Self-hosted
 * operators can swap in FAA NOTAM API / EUROCONTROL / NOTAMSearch via
 * the {@code airwatch.proxy.notam-base-url} env on the api side.
 *
 * <h3>Render strategy</h3>
 * NOTAMs are wordy and abbreviated. We surface ID + classification
 * + start/end + a 3-line preview, with an inline expand for the
 * full text. Empty result → small "No NOTAMs reported" line; we
 * NEVER hide the section header so the operator knows the panel
 * loaded.
 */
import { useEffect, useState } from 'react';
import { AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';

interface Props {
  icao: string | null;
  language: AppLanguage;
}

interface RawNotam {
  /** Different upstreams differ — we read several aliases. */
  notamNumber?: string;
  number?: string;
  id?: string;
  text?: string;
  message?: string;
  rawText?: string;
  classification?: string;
  /** ISO instant or DDhhmm depending on upstream. */
  effectiveStart?: string;
  effectiveEnd?: string;
  startDate?: string;
  endDate?: string;
}

interface ParsedNotam {
  id: string;
  text: string;
  classification: string | null;
  start: string | null;
  end: string | null;
}

function parseUpstreamNotam(raw: RawNotam): ParsedNotam {
  return {
    id: raw.notamNumber ?? raw.number ?? raw.id ?? '?',
    text: raw.text ?? raw.message ?? raw.rawText ?? '',
    classification: raw.classification ?? null,
    start: raw.effectiveStart ?? raw.startDate ?? null,
    end: raw.effectiveEnd ?? raw.endDate ?? null,
  };
}

export function NotamPanel({ icao, language }: Props) {
  const [items, setItems] = useState<ParsedNotam[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!icao) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/proxy/notam/${icao}`, { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(`http_${res.status}`);
          setItems([]);
          return;
        }
        const body = await res.json().catch(() => []);
        const list: RawNotam[] = Array.isArray(body) ? body : (body.notams ?? body.items ?? []);
        setItems(list.map(parseUpstreamNotam));
      })
      .catch(() => {
        if (!cancelled) {
          setError('network');
          setItems([]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [icao]);

  if (!icao) return null;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <AlertOctagon size={14} className="text-[var(--warning)]" aria-hidden />
          {t('notams', language)}
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{icao}</span>
        </span>
      }
      badge={items && items.length > 0 ? <Tag variant="warning" size="sm">{items.length}</Tag> : undefined}
      bare
      bodyClassName="px-4 pb-4 pt-2"
    >
      {loading ? (
        <p className="text-xs text-[var(--text-muted)]">{t('loading', language)}…</p>
      ) : error || !items || items.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          {error ? t('notams_unavailable', language) : t('notams_none', language)}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 10).map((n) => {
            const open = expanded.has(n.id);
            const preview = n.text.length > 200 && !open ? n.text.substring(0, 200) + '…' : n.text;
            return (
              <li key={n.id} className="border-l-2 border-[var(--warning)]/40 pl-2">
                <button
                  type="button"
                  onClick={() => toggle(n.id)}
                  className="w-full text-left flex items-start gap-2 hover:text-[var(--primary)] transition-colors"
                  aria-expanded={open}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-[10px] font-[var(--font-heading)] text-[var(--warning)]">
                        {n.id}
                      </span>
                      {n.classification && (
                        <Tag variant="warning" size="sm">{n.classification}</Tag>
                      )}
                      {n.start && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          {n.start.replace(/T/, ' ').slice(0, 16)}
                        </span>
                      )}
                      {n.end && n.end !== n.start && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">
                          → {n.end.replace(/T/, ' ').slice(0, 16)}
                        </span>
                      )}
                    </div>
                    <pre className="text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap mt-0.5">
                      {preview}
                    </pre>
                  </div>
                  {n.text.length > 200 && (
                    open ? <ChevronUp size={12} className="text-[var(--text-muted)] mt-0.5" />
                         : <ChevronDown size={12} className="text-[var(--text-muted)] mt-0.5" />
                  )}
                </button>
              </li>
            );
          })}
          {items.length > 10 && (
            <li className="text-[10px] text-[var(--text-muted)] pt-1">
              {t('notams_more', language).replace('{0}', String(items.length - 10))}
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
