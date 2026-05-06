/**
 * Features view — usage counters per EventCategory (saved-flights,
 * geo-fences, replays, AR, etc.). Lets product see which features
 * actually get used vs which got built and forgotten.
 *
 * Backend already returns a flat {category-code: count} map; we sort
 * by count descending and show as a horizontal bar chart + table.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { HBar } from '@/app/(admin)/admin/shared/charts/HBar';
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';
import { FeatureFlagsCard } from '@/app/(admin)/admin/features/FeatureFlagsCard';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

export default async function AdminFeaturesPage() {
  const [features, csrfToken, locale] = await Promise.all([
    fetchJson<Record<string, number>>('/admin/api/features'),
    fetchCsrfToken(),
    getLocale(),
  ]);
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  const entries = Object.entries(features ?? {}).sort(([, a], [, b]) => b - a);

  const total = entries.reduce((a, [, v]) => a + v, 0);
  const topUsed = entries[0];
  const unused = entries.filter(([, v]) => v === 0);

  const items = entries.map(([code, count], i) => ({
    label: code,
    value: count,
    color: count === 0
      ? 'var(--text-muted)'
      : i === 0 ? 'var(--success)'
      : i < 3 ? 'var(--info)'
      : 'var(--primary)',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>{t('page.features.title')}</h1>
        <p style={subtitleStyle}>{t('page.features.subtitle')}</p>
      </header>

      {/* Phase 2.8 — runtime feature flags. Renders the catalog with toggles. */}
      {csrfToken && <FeatureFlagsCard csrfToken={csrfToken} />}

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.features.kpi.categories')} value={entries.length} hint={t('page.features.kpi.categories_hint')} />
        <KpiCard label={t('page.features.kpi.total')}      value={total}            hint={t('page.features.kpi.total_hint')} />
        <KpiCard label={t('page.features.kpi.most_used')}  value={topUsed?.[1] ?? 0} tone="success" hint={topUsed?.[0] ?? '—'} />
        <KpiCard label={t('page.features.kpi.unused')}     value={unused.length}    tone={unused.length > 0 ? 'warning' : 'success'} hint={unused.length > 0 ? t('page.features.kpi.unused_hint') : t('page.features.kpi.unused_hint_all')} />
      </div>

      <section className="admin-card">
        <h2>{t('page.features.section.usage')}</h2>
        {items.length === 0 ? (
          <EmptyState
            icon="〰"
            title="No event categories yet"
            hint="EventMetrics hasn't recorded any feature usage. Either no clients have triggered tracked events since the last restart, or the feature beans aren't wired."
          />
        ) : (
          <HBar items={items} />
        )}
      </section>

      <section className="admin-card">
        <h2>All categories</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <Th>Category code</Th>
                <Th align="right">Events</Th>
                <Th align="right">Share</Th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([code, count]) => (
                <tr key={code} style={{ borderTop: '1px solid var(--border)' }}>
                  <Td>
                    <code style={{ color: 'var(--primary-bright)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem' }}>{code}</code>
                  </Td>
                  <Td align="right"><span style={{ color: count === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>{count.toLocaleString()}</span></Td>
                  <Td align="right">
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '—'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' as const };

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ textAlign: align, fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, padding: '0.5rem 0.75rem' }}>{children}</th>;
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '0.5rem 0.75rem', textAlign: align }}>{children}</td>;
}
