/**
 * Quota view — Airlabs API consumption (hour / day / month vs the
 * monthly cap). The hourly burn rate KPI flips warning when we're
 * tracking ahead of pace; the monthly bar flips error past 80%.
 */
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';

const QUOTA_RUNBOOK = `
# What this page tracks
The free Airlabs tier hands out a fixed number of API calls per UTC month. The poller chews through it every 60 s by default; if you don't watch it, you'll wake up on the 28th to a silent dashboard.

# When to act
- **Forecast** says fewer days of runway than days left in the month → throttle (raise \`AIRLABS_POLL_INTERVAL\`) **or** upgrade the Airlabs tier.
- **Hourly burn** sustained over 100% → poller is firing too often, usually after a misconfigured \`AIRLABS_POLL_INTERVAL\`.
- **Monthly usage** ≥ 90% → emergency throttle: bump interval to 5min, ride out the month.

# How to throttle
Set \`AIRLABS_POLL_INTERVAL=300000\` (= 5 minutes) in the api environment, then \`docker compose restart api\`.

# Cost view
Hidden when \`AIRLABS_COST_PER_1K_EUR\` is unset. Set it to your tier's per-1k price (e.g. \`1.50\`) to convert call counts to €.
`;

interface QuotaPayload {
  hourCount: number;
  dayCount: number;
  monthCount: number;
  monthlyQuota: number;
  remaining: number;
  monthlyUsagePercent: number;
  hourlyBurnPercent: number;
  // Phase 2.5 — forecast
  daysUntilEmpty: number | null;
  daysLeftInMonth: number;
  willExhaustEarly: boolean;
  // Phase 2.6 — cost
  costPer1kEur: number;
  costEnabled: boolean;
  costLastHourEur: number;
  costTodayEur: number;
  costThisMonthEur: number;
  projectedMonthlyCostEur: number;
}

export default async function AdminQuotaPage() {
  const [q, locale] = await Promise.all([
    fetchJson<QuotaPayload>('/admin/api/quota'),
    getLocale(),
  ]);
  const t = (key: string) => translate(locale, key);

  const monthlyPct = q?.monthlyUsagePercent ?? 0;
  const burnPct    = q?.hourlyBurnPercent ?? 0;
  const remaining  = q?.remaining ?? 0;
  const monthCount = q?.monthCount ?? 0;
  const dayCount   = q?.dayCount ?? 0;
  const hourCount  = q?.hourCount ?? 0;
  const cap        = q?.monthlyQuota ?? 0;

  const monthlyTone = monthlyPct >= 90 ? 'error' : monthlyPct >= 80 ? 'warning' : 'success';
  const burnTone    = burnPct >= 100 ? 'error' : burnPct >= 80 ? 'warning' : 'success';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>{t('page.quota.title')}</h1>
        <p style={subtitleStyle}>{t('page.quota.subtitle')}</p>
      </header>

      <HelpPanel pageId="quota" markdown={QUOTA_RUNBOOK} />

      <div style={kpiGridStyle}>
        <KpiCard label={t('page.quota.kpi.monthly_usage')} value={monthlyPct} decimals={2} unit="%" tone={monthlyTone} hint={`${monthCount.toLocaleString()} / ${cap.toLocaleString()}`} />
        <KpiCard label={t('page.quota.kpi.remaining')} value={remaining} tone={monthlyTone} hint={t('page.quota.kpi.remaining_hint')} />
        <KpiCard label={t('page.quota.kpi.hourly_burn')} value={burnPct} decimals={2} unit="%" tone={burnTone} hint={t('page.quota.kpi.hourly_burn_hint')} />
        <KpiCard label={t('page.quota.kpi.last_hour')} value={hourCount} hint={t('page.quota.kpi.last_hour_hint')} />
        <KpiCard label={t('page.quota.kpi.last_24h')} value={dayCount} hint={t('page.quota.kpi.last_24h_hint')} />
      </div>

      <section className="admin-card">
        <h2>{t('page.quota.section.monthly')}</h2>
        <ProgressBar pct={Math.min(monthlyPct, 100)} tone={monthlyTone} />
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {monthlyPct.toFixed(2)}% — {remaining.toLocaleString()} {t('page.quota.kpi.remaining_hint')}.
        </p>
      </section>

      <section className="admin-card">
        <h2>{t('page.quota.section.hourly')}</h2>
        <ProgressBar pct={Math.min(burnPct, 100)} tone={burnTone} />
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {burnPct.toFixed(2)}% — {burnPct < 100 ? 'tracking under the even-pace average.' : 'tracking over the even-pace average; quota will exhaust early if sustained.'}
        </p>
      </section>

      {/*
        Phase 2.5 — Forecast. Trajectory based on the most-recent 24h burn:
        "at this rate, your quota lasts another N days." Operators can
        compare against `daysLeftInMonth` to know whether to throttle.
      */}
      <ForecastCard q={q} />

      {/*
        Phase 2.6 — Cost view. Renders only when AIRLABS_COST_PER_1K_EUR
        is set; otherwise this card hides itself entirely so we don't
        show "€0.00 / day" and confuse the operator into thinking it's free.
      */}
      {q?.costEnabled && <CostCard q={q} />}
    </div>
  );
}

function ForecastCard({ q }: { q: QuotaPayload | null }) {
  if (!q) return null;
  const runway      = q.daysUntilEmpty;
  const daysLeft    = q.daysLeftInMonth;
  const willExhaust = q.willExhaustEarly;
  const tone        = willExhaust ? 'error' : runway !== null && runway < daysLeft * 1.2 ? 'warning' : 'success';
  const color       = tone === 'error' ? 'var(--error)' : tone === 'warning' ? 'var(--warning)' : 'var(--success)';

  return (
    <section className="admin-card">
      <h2>Forecast</h2>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '2.25rem', fontWeight: 600, color, lineHeight: 1 }}>
          {runway === null ? '∞' : runway >= 999 ? '999+' : runway.toFixed(1)}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          days of quota left at the current 24h burn rate
        </div>
      </div>
      <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
        {runway === null
          ? 'No calls in the last 24h — runway is effectively infinite.'
          : willExhaust
            ? <>⚠ Trajectory exceeds the {daysLeft} days remaining in the calendar month — quota <strong>will exhaust early</strong> if this pace holds. Throttle the poller (raise <code style={inlineCode}>AIRLABS_POLL_INTERVAL</code>) or upgrade the tier.</>
            : <>Pace is sustainable: {runway.toFixed(1)} days of runway vs {daysLeft} days remaining in the month. Quota resets on the 1st (UTC).</>}
      </p>
    </section>
  );
}

function CostCard({ q }: { q: QuotaPayload }) {
  return (
    <section className="admin-card">
      <h2>Cost</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
        Translated from API consumption at €{q.costPer1kEur.toFixed(2)} / 1000 calls. Set via <code style={inlineCode}>AIRLABS_COST_PER_1K_EUR</code>.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <CostTile label="LAST HOUR"   value={q.costLastHourEur} decimals={4} />
        <CostTile label="TODAY"       value={q.costTodayEur} />
        <CostTile label="THIS MONTH"  value={q.costThisMonthEur} highlight />
        <CostTile label="PROJECTED 30d" value={q.projectedMonthlyCostEur} hint="if 24h pace holds" />
      </div>
    </section>
  );
}

function CostTile({ label, value, decimals = 2, highlight = false, hint }: {
  label: string; value: number; decimals?: number; highlight?: boolean; hint?: string;
}) {
  return (
    <div style={{
      background: highlight ? 'color-mix(in srgb, var(--primary-bright) 5%, transparent)' : 'var(--sunken)',
      border: `1px solid ${highlight ? 'color-mix(in srgb, var(--primary-bright) 22%, transparent)' : 'var(--border)'}`,
      borderRadius: 6,
      padding: '0.75rem 0.875rem',
    }}>
      <div style={{
        fontFamily: 'var(--font-heading)',
        fontSize: '0.625rem',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        fontWeight: 700,
        marginBottom: 4,
      }}>{label}</div>
      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '1.25rem', fontWeight: 600, color: highlight ? 'var(--primary-bright)' : 'var(--text-primary)' }}>
        €{value.toFixed(decimals)}
      </div>
      {hint && (
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>{hint}</div>
      )}
    </div>
  );
}

const inlineCode = { color: 'var(--primary-bright)', fontSize: '0.75rem', background: 'var(--sunken)', padding: '1px 6px', borderRadius: 3 };

function ProgressBar({ pct, tone }: { pct: number; tone: 'success' | 'warning' | 'error' }) {
  const color = tone === 'error' ? 'var(--error)' : tone === 'warning' ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ width: '100%', height: 12, background: 'var(--sunken)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`,
        height: '100%',
        background: color,
        boxShadow: `0 0 16px color-mix(in srgb, ${color} 35%, transparent)`,
        transition: 'width 0.4s ease',
      }}/>
    </div>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const kpiGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' };
