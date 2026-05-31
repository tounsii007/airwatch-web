'use client';

import { useEffect, useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { API } from '@/lib/constants';
import { fetchAirlabsOne } from '@/lib/airlabs/fetch';
import { WikiSchema, type Wiki } from '@/lib/airlabs/schemas';
import { safeExternalUrl } from '@/lib/safeUrl';

interface Props {
  /** Either pass {@code airportIata} (3-letter) OR {@code airlineIata} (2-letter), not both. */
  airportIata?: string;
  airlineIata?: string;
}

/**
 * Inline Wikipedia summary card for airline / airport detail pages.
 *
 * <p>Backed by the proxied {@code /wiki} endpoint. The Wiki shape is
 * cache-friendly (long TTL upstream + 7-day local cache) and rarely
 * changes, so the panel is "fire-and-forget" — fetch once on mount,
 * render the summary + lead image, no auto-refresh.
 *
 * <p>Failure modes degrade silently: on rate-limit, quota, or upstream
 * outage we hide the panel entirely rather than showing a half-broken
 * "couldn't load Wikipedia" line that adds noise to the page. The Wiki
 * panel is decorative, not load-critical.
 */
export function WikiPanel({ airportIata, airlineIata }: Props) {
  const { language } = useSettingsStore();
  const [wiki, setWiki] = useState<Wiki | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!airportIata && !airlineIata) return;
    let cancelled = false;
    (async () => {
      const url = API.wiki({ airportIata, airlineIata });
      const result = await fetchAirlabsOne(url, WikiSchema, 'wiki');
      if (cancelled) return;
      if (!result.ok) {
        setHidden(true); // fail-soft — wiki is decorative
        return;
      }
      // Don't render if upstream gave us nothing useful.
      if (!result.item.summary && !result.item.image_url) {
        setHidden(true);
        return;
      }
      setWiki(result.item);
    })();
    return () => { cancelled = true; };
  }, [airportIata, airlineIata]);

  if (hidden || !wiki) return null;

  return (
    <GlassPanel className="p-4">
      <div className="flex items-start gap-3">
        {(() => {
          // Guard the upstream image URL with the same scheme allowlist used
          // for the wiki link, so a poisoned cache can't smuggle a non-http(s)
          // src into the DOM.
          const safeImg = safeExternalUrl(wiki.image_url);
          return safeImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={safeImg}
              alt=""
              className="w-20 h-20 object-cover rounded shrink-0 bg-[var(--surface-hover)]"
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null;
        })()}
        <div className="min-w-0">
          <h3 className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)] mb-1">
            {t('about', language)}
          </h3>
          {wiki.summary && (
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-5">
              {wiki.summary}
            </p>
          )}
          {(() => {
            const safe = safeExternalUrl(wiki.wiki_url);
            return safe ? (
              <a
                href={safe}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[10px] text-[var(--primary)] hover:underline"
              >
                {t('read_on_wikipedia', language)} →
              </a>
            ) : null;
          })()}
        </div>
      </div>
    </GlassPanel>
  );
}
