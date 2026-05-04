import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchJson } from '@/app/(admin)/admin/dashboard/fetcher';
import { SessionHeartbeat } from '@/app/(admin)/SessionHeartbeat';
import { AutoRefresh } from '@/app/(admin)/AutoRefresh';
import { THEME_BOOTSTRAP_SCRIPT } from '@/app/(admin)/ThemeSwitcher';
import { ToastProvider } from '@/app/(admin)/Toast';
import { FrontendErrorReporter } from '@/app/(admin)/FrontendErrorReporter';
import { I18nProvider } from '@/app/(admin)/i18n/I18nProvider';
import { getLocale } from '@/app/(admin)/i18n/getLocale';
import { translate } from '@/app/(admin)/i18n/messages';
import { LanguageSwitcher } from '@/app/(admin)/LanguageSwitcher';
import { GroupedNav } from '@/app/(admin)/GroupedNav';
import { KeyboardShortcuts } from '@/app/(admin)/KeyboardShortcuts';
import { MobileNav } from '@/app/(admin)/MobileNav';
import { MaintenanceBanner } from '@/app/(admin)/MaintenanceBanner';
import './admin.css';

/**
 * Admin layout — fully separate from the public app shell.
 *
 * Architectural separation:
 *   * No <BottomNav>, no <CommandPalette>, no <CommandPaletteController>,
 *     no service-worker registration, no web-vitals reporter, no ThemeProvider.
 *     Whatever the public app loads is irrelevant here — operators get a
 *     focused dashboard, not a flight tracker with admin sprinkled on top.
 *   * Own CSS file (admin.css) — same design tokens reused, but the public
 *     globals.css with its body backdrop, glass animations and bottom-nav
 *     positioning is NOT imported. Result: smaller admin bundle and zero
 *     accidental visual coupling.
 *   * Renders inside the SAME Next.js app as the public site (so the
 *     standalone build still ships a single server) but is gated by
 *     middleware.ts at runtime — public ingress on WEB_PORT serves a 404
 *     for `/admin/*`, only the dedicated NGINX_ADMIN_PORT (13099) routes
 *     here. See `proxy.ts` for the runtime separation.
 *
 * Auth gate:
 *   This layout server-side fetches /admin/api/csrf with the request's
 *   cookies. If the api responds with 401 (no session, expired session,
 *   or invalid cookie), we redirect() to the Thymeleaf-rendered
 *   /admin/login page. That happens BEFORE any admin page renders, so
 *   an unauthenticated visitor (incognito tab, fresh browser, expired
 *   session) never sees a single KPI tile or chart — they go straight
 *   to the login form.
 *
 *   /admin/login itself is served by Spring Boot (see nginx.conf), not
 *   Next.js, so it never reaches this layout — no infinite redirect
 *   risk.
 */

export const metadata: Metadata = {
  title: 'AirWatch — Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Validate the session before rendering anything. fetchJson forwards
  // the incoming AIRWATCH_ADMIN_SID cookie to /admin/api/csrf, which is
  // gated by AdminAuthFilter. A null result == 401 / no session.
  // We use the csrf endpoint specifically because:
  //   * It's the lightest auth-gated endpoint (returns ~60 bytes).
  //   * It's already needed by every action page; this fetch hits the
  //     same Redis lookup the page would have done anyway.
  //   * If the session is valid, the layout has the token cached for
  //     downstream pages (when we wire that through later).
  const auth = await fetchJson<{ available: boolean; token: string }>('/admin/api/csrf');
  // Phase 3.6 — read locale cookie server-side so the initial render
  // and the client-mounted I18nProvider use the same dictionary (no
  // flash-of-untranslated-content).
  const locale = await getLocale();
  // Server-side translate function so this server component (the
  // layout) can render its nav strings in the chosen locale without
  // mounting a client boundary just to call useT.
  const t = (key: string) => translate(locale, key);
  if (!auth || !auth.available) {
    redirect('/admin/login');
  }

  // CSP nonce is stamped per request by proxy.ts so the in-head theme
  // bootstrap script is allowed to run under our strict script-src
  // policy. Without the nonce the browser refuses the inline <script>
  // and the page flashes the default dark palette before the React
  // client takes over.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" className="admin-shell theme-dark">
      <head>
        {/*
          Apply the saved theme BEFORE first paint. Synchronous read of
          localStorage + classList swap on <html>. See ThemeSwitcher.tsx
          for the full rationale; the short version is "no flash of
          wrong-theme on a light-mode user's first navigation".
        */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>
        {/*
          Skip-link for keyboard / screen-reader users — first focusable
          element on the page, jumps past the (long) nav. Visible only
          on focus; see admin.css `.admin-skip-link`. Required by WCAG
          2.4.1 Bypass Blocks.
        */}
        <a href="#admin-main-content" className="admin-skip-link">
          Skip to main content
        </a>
        <ToastProvider>
        <I18nProvider locale={locale}>
        {/*
          Server-rendered banner — only shown when maintenance mode is
          ON in Redis. See MaintenanceBanner.tsx; the toggle endpoints
          live at /admin/maintenance/{enable,disable}.
        */}
        <MaintenanceBanner />
        <div className="admin-root">
          <header className="admin-header">
            <span className="admin-brand">AIRWATCH ADMIN</span>
            <MobileNav />
            {/*
              Phase 3.6 layout — GroupedNav renders 4 hover-dropdowns
              (Live / Metrics / Tools / System) plus a direct Dashboard
              link. CSS-only show/hide; see admin.css `.admin-nav-dropdown`.
            */}
            <GroupedNav locale={locale} />
            {/*
              Right-aligned chrome cluster: AutoRefresh + Language + Logout.
              Lives in its own flex group with margin-left:auto so the
              GroupedNav stays packed left and these utilities anchor right
              regardless of how many groups are rendered.
            */}
            <div className="admin-header-actions">
              <AutoRefresh />
              <LanguageSwitcher compact />
              <form method="post" action="/admin/logout" className="admin-nav-logout">
                <button type="submit">{t('nav.logout')}</button>
              </form>
            </div>
          </header>
          <main id="admin-main-content" className="admin-main" tabIndex={-1}>{children}</main>
        </div>
        {/*
          Mounted once per layout = once per admin tab. Continuously
          pings /admin/api/csrf so Spring Session keeps the cookie
          alive in Redis, and redirects to /admin/login the moment a
          ping returns 401 (session killed in another tab, kicked from
          /admin/users, server-side timeout). See SessionHeartbeat.tsx
          for the full rationale.
        */}
        <SessionHeartbeat />
        {/*
          Two-key navigation (g+d → Dashboard, etc.), `/` to focus
          search, `?` for help overlay. See KeyboardShortcuts.tsx.
        */}
        <KeyboardShortcuts />
        {/*
          Phase 3.1 — captures uncaught JS exceptions + unhandled promise
          rejections and POSTs them to /admin/api/frontend-errors. Visible
          on the Errors page under the "Frontend" tab.
        */}
        <FrontendErrorReporter />
        </I18nProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
