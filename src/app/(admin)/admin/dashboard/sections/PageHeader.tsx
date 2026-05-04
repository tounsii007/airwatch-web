/**
 * Dashboard page header — title, last-refresh hint, and the colour-coded
 * top-right status pill.
 *
 * <p>The "last refreshed" hint is wired to {@link ClientTime} so it
 * actually ticks instead of always reading "just now". The timestamp is
 * captured at server-render time (when the dashboard data was fetched)
 * and re-formatted relative to the current client clock — operators can
 * see at a glance whether the page has been sitting stale for 4 minutes.
 */
import { captionForUptime, toneForUptime } from '@/app/(admin)/admin/dashboard/utils';
import { ClientTime } from '@/app/(admin)/ClientTime';
import { translate, type LocaleCode } from '@/app/(admin)/i18n/messages';

const TONE_COLOR = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  error:   'var(--error)',
} as const;

interface Props {
  uptimePct: number;
  portsTotal: number;
  /** Server-side render timestamp (epoch ms). Defaults to Date.now() at render. */
  renderedAt?: number;
  /** Active locale — passed in from the dashboard server page. */
  locale?: LocaleCode;
}

export function PageHeader({ uptimePct, portsTotal, renderedAt, locale = 'en' }: Props) {
  const tone = toneForUptime(uptimePct);
  const colour = TONE_COLOR[tone];
  const t = (key: string) => translate(locale, key);
  // Capture the SSR moment if not supplied. AutoRefresh re-renders the
  // whole tree, so this naturally stays fresh per refresh interval.
  const ts = renderedAt ?? Date.now();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            letterSpacing: '0.04em',
            color: 'var(--primary-bright)',
          }}
        >
          {t('page.dashboard.title')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 }}>
          {t('page.dashboard.subtitle')} · {portsTotal} {t('nav.ports').toLowerCase()} · {t('page.dashboard.last_refreshed')}{' '}
          <ClientTime iso={ts} mode="relative" suffix="" />
        </p>
      </div>
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.6875rem',
          letterSpacing: '0.15em',
          color: colour,
          background: `color-mix(in srgb, ${colour} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${colour} 22%, transparent)`,
          padding: '4px 10px',
          borderRadius: 999,
        }}
      >
        ● {captionForUptime(uptimePct)}
      </span>
    </div>
  );
}
