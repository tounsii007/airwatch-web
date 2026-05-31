'use client';

/**
 * Live ATC audio panel for the airport detail page.
 *
 * <h3>Sourcing</h3>
 * Calls {@code /api/proxy/atc/{icao}}. The backend returns a small
 * envelope with feed metadata (kind, label, mount, streamUrl,
 * externalUrl) sourced from a curated atc-feeds.json. We embed
 * LiveATC's MP3 stream directly via an HTML5 {@code <audio>} element
 * — LiveATC's CDN serves with permissive CORS, so we don't byte-pipe
 * the stream through the API (would burn a Tomcat thread per listener).
 *
 * <h3>Render strategy</h3>
 * <ul>
 *   <li>Loading → small text ("Loading…").</li>
 *   <li>Error / no feeds known → fallback line + a deeplink to
 *       liveatc.net's airport search ("Search on LiveATC.net").</li>
 *   <li>One feed → inline player, no picker.</li>
 *   <li>Many feeds → chip-style picker; switching feeds replaces the
 *       audio source so the previous stream stops cleanly.</li>
 * </ul>
 *
 * <h3>Why an iframe-free embed</h3>
 * LiveATC's official embed widget pulls in their analytics + ads. A
 * raw audio element keeps the page CSP-clean (no third-party JS) and
 * stays in the same origin from the user's perspective.
 */
import { useEffect, useState } from 'react';
import { Headphones, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { t } from '@/lib/i18n/translations';
import { safeExternalUrl } from '@/lib/safeUrl';
import type { AppLanguage } from '@/lib/types';

interface Props {
  icao: string | null;
  language: AppLanguage;
}

interface Feed {
  kind: string;
  label: string;
  mount: string;
  streamUrl: string;
  externalUrl: string;
}

interface Response {
  icao: string;
  count: number;
  feeds: Feed[];
  attribution: string;
}

export function AtcAudioPanel({ icao, language }: Props) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMount, setActiveMount] = useState<string | null>(null);

  useEffect(() => {
    if (!icao) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/proxy/atc/${icao}`, { cache: 'no-store' })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) { setData(null); return; }
        const body: Response = await res.json();
        if (cancelled) return;
        setData(body);
        // Auto-pick the Tower feed if present, else the first feed.
        const tower = body.feeds.find((f) => f.kind === 'TOWER');
        setActiveMount((tower ?? body.feeds[0])?.mount ?? null);
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [icao]);

  if (!icao) return null;

  const active = data?.feeds.find((f) => f.mount === activeMount) ?? null;

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Headphones size={14} className="text-[var(--primary)]" aria-hidden />
          {t('atc_audio_title', language)}
          <span className="text-[10px] text-[var(--text-muted)] font-mono">{icao}</span>
        </span>
      }
      badge={data && data.count > 0 ? <Tag variant="info" size="sm">{data.count}</Tag> : undefined}
      bare
      bodyClassName="px-4 pb-4 pt-2"
    >
      {loading ? (
        <p className="text-xs text-[var(--text-muted)]">{t('loading', language)}…</p>
      ) : !data || data.count === 0 ? (
        <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
          <span>{t('atc_audio_no_feeds', language)}</span>
          <a
            href={`https://www.liveatc.net/search/?icao=${icao}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
          >
            LiveATC.net
            <ExternalLink size={10} />
          </a>
        </div>
      ) : (
        <>
          {data.feeds.length > 1 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {data.feeds.map((f) => {
                const on = f.mount === activeMount;
                return (
                  <button
                    key={f.mount}
                    type="button"
                    onClick={() => setActiveMount(f.mount)}
                    className={`text-[10px] px-2 py-0.5 rounded-full font-[var(--font-heading)] transition-colors
                      ${on
                        ? 'bg-[var(--primary)]/20 text-[var(--primary)] ring-1 ring-[var(--primary)]/40'
                        : 'bg-[var(--glass-border)]/30 text-[var(--text-secondary)] hover:bg-[var(--glass-border)]/50'}`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          )}

          {active && (
            <div className="space-y-1.5">
              {/* The audio element is keyed by mount so React replaces
                  the source cleanly when the feed changes — otherwise
                  setting src on the same element can leave the previous
                  stream playing in the background until GC. */}
              <audio
                key={active.mount}
                src={active.streamUrl}
                controls
                preload="none"
                className="w-full h-8"
                aria-label={`${active.label} live audio`}
              />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>{data.attribution}</span>
                {(() => {
                  // Guard the upstream-sourced URL: a poisoned atc-feeds cache
                  // could inject a javascript:/data: href (CSP doesn't block
                  // those in <a href>). Render the link only when it's http(s).
                  const safe = safeExternalUrl(active.externalUrl);
                  return safe ? (
                    <a
                      href={safe}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
                    >
                      LiveATC.net
                      <ExternalLink size={10} />
                    </a>
                  ) : null;
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
