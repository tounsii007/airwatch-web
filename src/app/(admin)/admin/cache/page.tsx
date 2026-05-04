/**
 * Cache view — Caffeine cache stats per cache (size, hits, misses,
 * evictions, hit-rate %) plus a single "Clear all caches" button.
 *
 * The form posts to /admin/cache/clear; AdminAuthFilter validates the
 * session + CSRF token, the controller invalidates every cache, then
 * redirects back here.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { ActionResultToast } from '@/app/(admin)/ActionResultToast';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

const CACHE_RUNBOOK = `
# Caches at a glance
Per-Caffeine cache: \`size\` (entries currently in memory), \`hits\` (successful lookups), \`misses\` (lookups that triggered a load), \`evictions\` (size-cap overflows).

# Hit-rate signals
- **\\>= 80%** — cache is doing its job
- **50–80%** — borderline; worth checking the per-cache row to see *which* cache is dragging the average down
- **< 50%** — either the cache is too small, the workload is genuinely sparse, or the underlying load is fast enough that caching isn't earning its keep

# When to clear
- After a config change that invalidates cached responses (e.g. you bumped the Airlabs API key)
- After confirming a stale-data bug (clear → reproduce on a fresh fetch)
- **Don't** clear during a traffic spike — every cache miss hits the upstream

Clearing is cluster-wide via Redis broadcast: both api replicas drop their local Caffeine entries simultaneously.
`;
import { EmptyState } from '@/app/(admin)/admin/shared/components/EmptyState';

interface CacheRow {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRatePercent: number;
}

export default async function AdminCachePage() {
  const [cachesRaw, csrfToken, locale] = await Promise.all([
    fetchJson<Record<string, CacheRow>>('/admin/api/cache'),
    fetchCsrfToken(),
    getLocale(),
  ]);
  const t = (key: string) => translate(locale, key);

  const caches = cachesRaw ?? {};
  const names = Object.keys(caches);

  const totalSize   = names.reduce((a, n) => a + caches[n].size, 0);
  const totalHits   = names.reduce((a, n) => a + caches[n].hits, 0);
  const totalMisses = names.reduce((a, n) => a + caches[n].misses, 0);
  const totalEvict  = names.reduce((a, n) => a + caches[n].evictions, 0);
  const overallReq  = totalHits + totalMisses;
  const overallHit  = overallReq > 0 ? (totalHits / overallReq) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <ActionResultToast
        successMessages={{ cleared: 'All caches flushed. Next call rebuilds fresh entries.' }}
      />
      <HelpPanel pageId="cache" markdown={CACHE_RUNBOOK} />
      <header style={headerRowStyle}>
        <div>
          <h1 style={headingStyle}>{t('page.cache.title')}</h1>
          <p style={subtitleStyle}>{t('page.cache.subtitle')}</p>
        </div>
        {csrfToken && names.length > 0 && (
          <form method="post" action="/admin/cache/clear">
            <input type="hidden" name="_csrf" value={csrfToken} />
            <button type="submit" style={dangerButtonStyle}>{t('page.cache.action.clear')}</button>
          </form>
        )}
      </header>

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.cache.kpi.caches')} value={names.length} hint={t('page.cache.kpi.caches_hint')} />
        <KpiCard label={t('page.cache.kpi.entries')} value={totalSize} hint={t('page.cache.kpi.entries_hint')} />
        <KpiCard
          label={t('page.cache.kpi.hit_rate')}
          value={overallHit}
          decimals={1}
          unit="%"
          tone={overallHit >= 80 ? 'success' : overallHit >= 50 ? 'warning' : 'error'}
          hint={`${totalHits.toLocaleString()} / ${totalMisses.toLocaleString()}`}
        />
        <KpiCard label={t('page.cache.kpi.evictions')} value={totalEvict} tone={totalEvict > 1000 ? 'warning' : 'default'} hint={t('page.cache.kpi.evictions_hint')} />
      </div>

      <section className="admin-card">
        <h2>{t('page.cache.section.per_cache')}</h2>
        {names.length === 0 ? (
          <EmptyState
            icon="∅"
            title="No caches registered"
            hint="CacheManager has no named caches. Verify CacheConfig beans loaded — Caffeine caches are normally registered at startup."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <Th>Name</Th>
                  <Th align="right">Entries</Th>
                  <Th align="right">Hits</Th>
                  <Th align="right">Misses</Th>
                  <Th align="right">Evictions</Th>
                  <Th align="right">Hit-rate</Th>
                </tr>
              </thead>
              <tbody>
                {names.map((name) => {
                  const c = caches[name];
                  const tone = c.hitRatePercent >= 80 ? 'var(--success)'
                              : c.hitRatePercent >= 50 ? 'var(--warning)'
                              : c.hits + c.misses === 0 ? 'var(--text-muted)'
                              : 'var(--error)';
                  return (
                    <tr key={name} style={{ borderTop: '1px solid var(--border)' }}>
                      <Td>
                        <code style={{ color: 'var(--primary-bright)', fontFamily: 'var(--font-heading)' }}>{name}</code>
                      </Td>
                      <Td align="right">{c.size.toLocaleString()}</Td>
                      <Td align="right">{c.hits.toLocaleString()}</Td>
                      <Td align="right">{c.misses.toLocaleString()}</Td>
                      <Td align="right">
                        <span style={{ color: c.evictions > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {c.evictions.toLocaleString()}
                        </span>
                      </Td>
                      <Td align="right">
                        <span style={{ color: tone, fontWeight: 600 }}>{c.hitRatePercent.toFixed(1)}%</span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const headerRowStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '0.75rem' };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' as const };
const dangerButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--warning)',
  background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--warning) 28%, transparent)',
  padding: '0.5rem 1rem',
  borderRadius: 4,
  cursor: 'pointer',
};

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <th style={{ textAlign: align, fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, padding: '0.5rem 0.75rem' }}>{children}</th>;
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return <td style={{ padding: '0.5rem 0.75rem', textAlign: align }}>{children}</td>;
}
