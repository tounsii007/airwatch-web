/**
 * Admin dashboard — page-level orchestrator.
 *
 * Each visual block lives in its own file under {@code dashboard/sections/};
 * shared chart primitives + reusable controls live under
 * {@code shared/charts/} and {@code shared/components/}. This file does
 * three jobs and three jobs only:
 *
 *   1. Fetch all data via {@link fetchDashboardData}.
 *   2. Pre-compute the KPI numbers + country aggregates that more than
 *      one section consumes.
 *   3. Compose the sections in vertical order.
 *
 * Server-rendered. The few reactive / polling parts (LiveFeed,
 * LoadCurves, UserCurves, the chart sections) are 'use client'
 * components and re-fetch on their own.
 */

import { fetchDashboardData, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { getLocale } from '@/app/(admin)/i18n/getLocale';

import { PageHeader }           from '@/app/(admin)/admin/dashboard/sections/PageHeader';
import { KpiStrip }             from '@/app/(admin)/admin/dashboard/sections/KpiStrip';
import { StatusOverviewRow }    from '@/app/(admin)/admin/dashboard/sections/StatusOverviewRow';
import { PortGrid }             from '@/app/(admin)/admin/dashboard/sections/PortGrid';
import { SecurityRow }          from '@/app/(admin)/admin/dashboard/sections/SecurityRow';
import { LoadCurves }           from '@/app/(admin)/admin/dashboard/sections/LoadCurves';
import { UserCurves }           from '@/app/(admin)/admin/dashboard/sections/UserCurves';
import { CountryChart }         from '@/app/(admin)/admin/dashboard/sections/CountryChart';
import { ViewPopularityChart }  from '@/app/(admin)/admin/dashboard/sections/ViewPopularityChart';
import { MapStyleChart }        from '@/app/(admin)/admin/dashboard/sections/MapStyleChart';
import { AlertsPanel }          from '@/app/(admin)/admin/dashboard/sections/AlertsPanel';
import { CriticalErrorPanel }   from '@/app/(admin)/admin/dashboard/sections/CriticalErrorPanel';
import { ActionResultToast }    from '@/app/(admin)/ActionResultToast';

export default async function AdminDashboardPage() {
  const { ports, portsWithHistory, blocked, recent } = await fetchDashboardData();
  // CSRF token used by AlertsPanel for ack/snooze/mute actions (Phase 2.1).
  const [csrfToken, locale] = await Promise.all([fetchCsrfToken(), getLocale()]);

  // ── KPI / aggregate math (consumed by multiple sections) ─────────────
  const portsUp     = ports?.filter((p) => p.up).length ?? 0;
  const portsTotal  = ports?.length ?? 0;
  const uptimePct   = portsTotal > 0 ? Math.round((portsUp / portsTotal) * 1000) / 10 : 0;
  const totalBlocked = blocked?.reduce((a, b) => a + b.attempt_count, 0) ?? 0;
  const uniqueIps    = blocked?.length ?? 0;
  const recentRate   = recent?.length ?? 0;

  const upPorts = portsWithHistory.filter((p) => p.up);
  const avgLatencyMs = upPorts.length > 0
    ? Math.round(upPorts.reduce((a, p) => a + (p.latency_ms ?? 0), 0) / upPorts.length)
    : 0;

  // Country aggregate — Phase 1 was empty (no GeoIP yet); Phase 2 fills
  // blocked.country_code so the WorldMap actually lights up.
  const countryCounts: Record<string, number> = {};
  for (const b of blocked ?? []) {
    if (b.country_code) {
      countryCounts[b.country_code] = (countryCounts[b.country_code] ?? 0) + b.attempt_count;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Toast feedback for the maintenance toggle that lives on the
          Settings page but redirects back here on success. */}
      <ActionResultToast
        successMessages={{
          maintenance_on:  'Maintenance mode enabled — public traffic now sees the maintenance page.',
          maintenance_off: 'Maintenance mode disabled — service back online.',
        }}
      />
      <PageHeader uptimePct={uptimePct} portsTotal={portsTotal} locale={locale} />

      <KpiStrip
        uptimePct={uptimePct}
        portsUp={portsUp}
        portsTotal={portsTotal}
        totalBlocked={totalBlocked}
        uniqueIps={uniqueIps}
        recentRate={recentRate}
        avgLatencyMs={avgLatencyMs}
      />

      <StatusOverviewRow
        portsUp={portsUp}
        portsTotal={portsTotal}
        uptimePct={uptimePct}
        countryCounts={countryCounts}
      />

      <PortGrid ports={portsWithHistory} />

      <LoadCurves defaultService="api" />

      <UserCurves />

      <SecurityRow blocked={blocked ?? []} recent={recent ?? []} />

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
        className="admin-grid-2col"
      >
        <CountryChart />
        <ViewPopularityChart />
      </div>

      <MapStyleChart />

      {/* ── Alerts + critical errors row (Phase 3) ────────────────────── */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
        className="admin-grid-2col"
      >
        <AlertsPanel csrfToken={csrfToken} />
        <CriticalErrorPanel />
      </div>
    </div>
  );
}
