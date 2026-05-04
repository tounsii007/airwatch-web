/**
 * Detail table for the Ports view — every column the dashboard tile
 * crops out: full host:port, last error message, exact ms, last probe
 * timestamp. Sorted by status (DOWN first), then by latency descending,
 * so the worst offender is at the top.
 *
 * The header carries its own RefreshButton so an operator can re-pull
 * just the ports data without scrolling back to the global header.
 */
import type { PortRowWithHistory } from '@/app/(admin)/admin/dashboard/types';
import { ClientTime } from '@/app/(admin)/ClientTime';
import { RefreshButton } from '@/app/(admin)/RefreshButton';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';

interface Props {
  ports: readonly PortRowWithHistory[];
}

export function PortsTable({ ports }: Props) {
  const sorted = [...ports].sort((a, b) => {
    if (a.up !== b.up) return a.up ? 1 : -1;          // DOWN first
    return (b.latency_ms ?? 0) - (a.latency_ms ?? 0); // slowest first within each group
  });

  return (
    <section className="admin-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          gap: '0.75rem',
        }}
      >
        <h2 style={{ margin: 0 }}>All ports</h2>
        <RefreshButton />
      </div>
      {sorted.length === 0 ? (
        <EmptyState
          icon="⏳"
          title="No probes yet"
          hint="The port-monitor service hasn't completed its first round. The first probe fires 30 s after startup; subsequent rounds every probe interval."
        />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.8125rem',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <Th>Status</Th>
                <Th>Port</Th>
                <Th>Endpoint</Th>
                <Th align="right">Latency</Th>
                <Th align="right">Last probe</Th>
                <Th>Last error</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr
                  key={p.port_name}
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <Td>
                    <span
                      className={`pill ${p.up ? 'pill-up' : 'pill-down'}`}
                      style={{ fontSize: '0.5625rem', padding: '0 6px' }}
                    >
                      {p.up ? 'UP' : 'DOWN'}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: 'var(--primary-bright)', fontFamily: 'var(--font-heading)' }}>
                      {p.port_name}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {p.host}:{p.port_number}
                    </span>
                  </Td>
                  <Td align="right">
                    <span style={{ color: p.up ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {p.latency_ms != null ? `${p.latency_ms} ms` : '—'}
                    </span>
                  </Td>
                  <Td align="right">
                    <ClientTime
                      iso={p.probed_at}
                      mode="relative"
                      style={{ color: 'var(--text-muted)' }}
                    />
                  </Td>
                  <Td>
                    {p.error_msg ? (
                      <code
                        style={{
                          color: 'var(--error)',
                          background: 'color-mix(in srgb, var(--error) 8%, transparent)',
                          padding: '2px 6px',
                          borderRadius: 3,
                          fontSize: '0.6875rem',
                        }}
                      >
                        {p.error_msg}
                      </code>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        fontFamily: 'var(--font-heading)',
        fontSize: '0.625rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        fontWeight: 700,
        padding: '0.5rem 0.75rem',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td style={{ padding: '0.5rem 0.75rem', textAlign: align }}>
      {children}
    </td>
  );
}
