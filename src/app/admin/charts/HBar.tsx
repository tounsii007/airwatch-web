/**
 * Horizontal bar chart for "top N" ranked lists — top blocked IPs, top
 * countries, top routes by views, etc. Each bar grows from the left with
 * a smooth CSS transition on the `width` property — that's the entire
 * animation, no JS.
 *
 *   <HBar items={[{ label: '92.156.x.x', value: 412, color: 'var(--error)' }, ...]} />
 *
 * Items are rendered in the order given — sort upstream. The widest bar
 * fills 100 % of the container; everything else scales relative to it.
 */
import type { ReactNode } from 'react';

interface Item {
  label: string;
  value: number;
  /** Optional per-row colour. Defaults to var(--primary-bright). */
  color?: string;
  /** Optional badge / icon shown next to the label. */
  badge?: ReactNode;
}

interface Props {
  items: readonly Item[];
  /** Optional unit appended to the value. */
  unit?: string;
  /** Format function for the displayed value. */
  format?: (n: number) => string;
}

export function HBar({ items, unit = '', format = (n) => n.toLocaleString() }: Props) {
  if (items.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No data.</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((it, idx) => {
        const pct = (it.value / max) * 100;
        const color = it.color ?? 'var(--primary-bright)';
        return (
          <div
            key={`${it.label}-${idx}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {it.badge && <span style={{ marginRight: 6 }}>{it.badge}</span>}
                  {it.label}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(122, 154, 191, 0.10)',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${color} 0%, color-mix(in srgb, ${color} 60%, transparent) 100%)`,
                    boxShadow: `0 0 8px color-mix(in srgb, ${color} 40%, transparent)`,
                    transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.875rem',
                fontWeight: 700,
                color,
                fontVariantNumeric: 'tabular-nums',
                minWidth: '4ch',
                textAlign: 'right',
              }}
            >
              {format(it.value)}{unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}
