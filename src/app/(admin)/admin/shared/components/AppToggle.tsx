'use client';

/**
 * Two-button pill toggle between the "web" and "mobile" apps. Used by
 * CountryChart, ViewPopularityChart, MapStyleChart, UserCurves — every
 * dashboard surface that splits stats per app needs the same control.
 *
 * Extracted from the inlined per-section copies so the visual treatment
 * stays consistent and a future style tweak (a third app, e.g. "tv")
 * happens in one place.
 */

export type App = 'web' | 'mobile';

interface Props {
  value: App;
  onChange: (next: App) => void;
  /** Optional override for the active-fill colour. Default is the
   *  primary-bright accent — pass var(--accent) for the user-curves
   *  panel which uses orange to differentiate from the metric switches. */
  activeColor?: string;
}

export function AppToggle({ value, onChange, activeColor = 'var(--primary-bright)' }: Props) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        padding: 3,
        background: 'var(--sunken)',
        border: '1px solid var(--border)',
        borderRadius: 999,
      }}
    >
      {(['web', 'mobile'] as const).map((a) => {
        const active = value === a;
        return (
          <button
            key={a}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(a)}
            style={{
              border: 'none',
              cursor: 'pointer',
              padding: '4px 12px',
              borderRadius: 999,
              fontFamily: 'var(--font-heading)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: active ? 'var(--bg)' : 'var(--text-muted)',
              background: active ? activeColor : 'transparent',
              transition: 'background 200ms, color 200ms',
            }}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}
