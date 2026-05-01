import type { Metadata } from 'next';
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
 * Auth note:
 *   The Spring Boot AdminAuthFilter still gates `/admin/api/**` server-side —
 *   the dashboard simply 401s if the operator hasn't authenticated. There's
 *   a /admin/login page on the API side (Thymeleaf) that issues the
 *   session cookie; once you have it, this dashboard is reachable.
 */

export const metadata: Metadata = {
  title: 'AirWatch — Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="admin-shell dark">
      <body>
        <div className="admin-root">
          <header className="admin-header">
            <span className="admin-brand">AIRWATCH ADMIN</span>
            <nav className="admin-nav">
              <a href="/admin/dashboard">Dashboard</a>
              <a href="/admin/ports">Ports</a>
              <a href="/admin/security">Security</a>
              <a href="/admin/login">Login</a>
            </nav>
          </header>
          <main className="admin-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
