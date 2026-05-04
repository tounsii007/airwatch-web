'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { RANGES, type RangeOption } from '@/app/(admin)/admin/instances/rangeOptions';

/**
 * Time-window selector for the Instances page.
 *
 * Drives the {@code ?range=…} search-param. The server component reads
 * it on the next render and refetches /admin/api/monitoring/loads with
 * the matching {@code minutes} value.
 *
 * Range data + the rangeFromQuery() helper now live in
 * {@code rangeOptions.ts} (no 'use client') so server components can
 * resolve the active range without importing this client module.
 */

export function InstancesRangePicker({ active }: { active: RangeOption['id'] }) {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  function pick(id: RangeOption['id']) {
    const next = new URLSearchParams(params.toString());
    next.set('range', id);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div role="tablist" aria-label="Time range" style={{ display: 'inline-flex', gap: 2, padding: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}>
      {RANGES.map((r) => {
        const on = r.id === active;
        return (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => pick(r.id)}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.7rem',
              letterSpacing: '0.1em',
              color: on ? 'var(--primary-bright)' : 'var(--text-muted)',
              background: on ? 'color-mix(in srgb, var(--primary-bright) 12%, transparent)' : 'transparent',
              border: '1px solid transparent',
              padding: '0.25rem 0.65rem',
              borderRadius: 3,
              cursor: 'pointer',
              minWidth: 36,
            }}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
