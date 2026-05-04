/**
 * Settings view — password change + TOTP 2FA management.
 *
 * Forms post directly to the Spring Boot endpoints. Spring Boot
 * sendRedirects back here with ?success=… or ?error=… and we render
 * a banner accordingly.
 *
 * The pendingSecret + qrCodeDataUrl come fresh on every render — that
 * was the same behaviour as the old Thymeleaf page; until the user
 * actually POSTs /settings/2fa/enable with a matching confirmCode the
 * secret is not persisted anywhere.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { ThemeSwitcher } from '@/app/(admin)/ThemeSwitcher';
import { MaintenanceModeCard } from '@/app/(admin)/admin/settings/MaintenanceModeCard';
import { MaintenanceSchedulesCard } from '@/app/(admin)/admin/settings/MaintenanceSchedulesCard';
import { ApiKeysCard } from '@/app/(admin)/admin/settings/ApiKeysCard';
import { WebhookCard } from '@/app/(admin)/admin/settings/WebhookCard';
import { ActionResultToast } from '@/app/(admin)/ActionResultToast';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';

const SETTINGS_RUNBOOK = `
# Sections in order
1. **Theme** — browser-side preference, no auth round-trip
2. **Maintenance toggle** — flip the cluster-wide flag in Redis (now)
3. **Maintenance schedules** — cron-driven auto-toggles (Phase 2.4)
4. **API keys** — long-lived bearer tokens for programmatic access (Phase 1.3)
5. **Password change** — overrides the env-configured hash via \`admin_settings\`
6. **2FA** — TOTP, scan into Authenticator before confirming

# Password vs env hash
Setting a password here writes to \`admin_settings.admin.password.hash\` which **takes precedence** over the \`ADMIN_PASSWORD_HASH\` env var. To roll back to env-only auth, delete the row directly in Postgres.

# Lost authenticator?
1. Delete the row \`admin_settings.admin.totp.secret\` in Postgres
2. Log in with password only
3. Re-enrol from this page

There is no app-side recovery code flow — the DB row IS the recovery.
`;

interface SettingsPayload {
  username: string;
  totpEnabled: boolean;
  pendingSecret: string;
  qrCodeDataUrl: string;
}

interface SearchParams {
  success?: string;
  error?: string;
}

const ERROR_MSG: Record<string, string> = {
  badcurrent:  'Current password is incorrect.',
  tooshort:    'New password must be at least 12 characters.',
  mismatch:    'New password and confirmation do not match.',
  persist:     'Failed to persist the change. Try again or check the database.',
  bad2facode:  'The 6-digit code did not match. Try again with a fresh code from your authenticator.',
};

const SUCCESS_MSG: Record<string, string> = {
  password:      'Password changed and persisted.',
  '2fa_enabled': '2FA enabled. Future logins will require an authenticator code.',
  '2fa_disabled':'2FA disabled. Future logins use the password only.',
};

export default async function AdminSettingsPage(_props: {
  searchParams: Promise<SearchParams>;
}) {
  // searchParams is intentionally unused here — ActionResultToast (a
  // client component) reads them via useSearchParams and dispatches the
  // toast itself, so we don't need the server-side render branch.
  const [data, csrfToken] = await Promise.all([
    fetchJson<SettingsPayload>('/admin/api/settings'),
    fetchCsrfToken(),
  ]);

  const username      = data?.username ?? '—';
  const totpEnabled   = data?.totpEnabled ?? false;
  const pendingSecret = data?.pendingSecret ?? '';
  const qrCodeDataUrl = data?.qrCodeDataUrl ?? '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Replaces the inline Alert banners — toast feedback is consistent
          with the rest of the dashboard's action surface. SUCCESS_MSG /
          ERROR_MSG carry the same operator-friendly strings as before. */}
      <ActionResultToast successMessages={SUCCESS_MSG} errorMessages={ERROR_MSG} />

      <HelpPanel pageId="settings" markdown={SETTINGS_RUNBOOK} />

      <header>
        <h1 style={headingStyle}>Settings</h1>
        <p style={subtitleStyle}>Account credentials + two-factor authentication for user <code style={inlineCode}>{username}</code>.</p>
      </header>

      {/*
        Theme picker first — pure browser-side preference, doesn't go
        through CSRF or the api at all. Putting it above the credential
        forms so an operator landing here to "fix the colours" doesn't
        have to scroll past their auth settings.
      */}
      <ThemeSwitcher />

      {/*
        Maintenance toggle — cluster-wide flag stored in Redis.
        Server-rendered (it makes its own /admin/api/maintenance fetch)
        so the current state is always fresh on page load.
      */}
      <MaintenanceModeCard csrfToken={csrfToken} />

      {/*
        Phase 2.4 — operator-defined maintenance windows. The backend
        scheduler polls these every minute and auto-toggles maintenance
        mode at the configured cron + duration.
      */}
      {csrfToken && <MaintenanceSchedulesCard csrfToken={csrfToken} />}

      {/*
        API Keys — programmatic admin auth. Client component so the post-mint
        plaintext token can flash up in a one-time modal without a full
        round-trip; the CSRF token is passed in from this server render so
        we don't double-fetch it.
      */}
      {csrfToken && <ApiKeysCard csrfToken={csrfToken} />}

      {/*
        Webhook config + test button. Read-only status (URL is a deploy-
        time secret, not editable here); operator can synchronously fire a
        test alert and see the upstream HTTP status.
      */}
      {csrfToken && <WebhookCard csrfToken={csrfToken} />}

      <section className="admin-card">
        <h2>Change password</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
          New password must be at least 12 characters. Persists to the <code style={inlineCode}>admin_settings</code> table — overrides the env-configured hash.
        </p>
        {csrfToken ? (
          <form method="post" action="/admin/settings/password" style={formColStyle}>
            <input type="hidden" name="_csrf" value={csrfToken} />
            <FormField label="Current password" name="currentPassword" type="password" autoComplete="current-password" required />
            <FormField label="New password" name="newPassword" type="password" autoComplete="new-password" required minLength={12} />
            <FormField label="Confirm new password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} />
            <button type="submit" style={primaryButtonStyle}>Update password</button>
          </form>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>CSRF token unavailable — re-login.</p>
        )}
      </section>

      <section className="admin-card">
        <h2>Two-factor authentication</h2>
        {totpEnabled ? (
          <>
            <p style={{ color: 'var(--success)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              ✓ 2FA is currently <strong>enabled</strong>. Disable it only if your authenticator is lost — store the recovery codes first.
            </p>
            {csrfToken && (
              <form method="post" action="/admin/settings/2fa/disable">
                <input type="hidden" name="_csrf" value={csrfToken} />
                <button type="submit" style={dangerButtonStyle}>Disable 2FA</button>
              </form>
            )}
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.75rem' }}>
              Scan this QR code in Google Authenticator / Authy / 1Password, then enter the 6-digit code below to confirm.
              The secret is generated fresh on each page load and only persisted after a successful confirmation.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="2FA QR code"
                  width={180}
                  height={180}
                  style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid var(--border)' }}
                />
              ) : (
                <div style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sunken)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  QR unavailable
                </div>
              )}
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={fieldLabelStyle}>Manual entry secret</div>
                  <code style={{ ...inlineCode, display: 'block', padding: '0.5rem 0.75rem', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                    {pendingSecret || '—'}
                  </code>
                </div>
                {csrfToken && pendingSecret && (
                  <form method="post" action="/admin/settings/2fa/enable" style={formColStyle}>
                    <input type="hidden" name="_csrf" value={csrfToken} />
                    <input type="hidden" name="pendingSecret" value={pendingSecret} />
                    <FormField
                      label="6-digit code"
                      name="confirmCode"
                      type="text"
                      autoComplete="one-time-code"
                      required
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                    />
                    <button type="submit" style={primaryButtonStyle}>Enable 2FA</button>
                  </form>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function FormField({
  label, name, type, required, autoComplete, minLength, maxLength, pattern, placeholder,
}: {
  label: string;
  name: string;
  type: 'text' | 'password';
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        pattern={pattern}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

const headingStyle = { fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.04em', color: 'var(--primary-bright)' };
const subtitleStyle = { color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 };
const inlineCode = { color: 'var(--primary-bright)', fontSize: '0.8125rem', background: 'var(--sunken)', padding: '1px 6px', borderRadius: 3 };
const formColStyle = { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem', maxWidth: 400 };
const fieldLabelStyle = { fontFamily: 'var(--font-heading)', fontSize: '0.625rem', letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', fontWeight: 700 };
const inputStyle = {
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '0.5rem 0.75rem',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: '0.875rem',
};
const primaryButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.75rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 28%, transparent)',
  padding: '0.6rem 1.25rem',
  borderRadius: 4,
  cursor: 'pointer',
  alignSelf: 'flex-start' as const,
};
const dangerButtonStyle = {
  ...primaryButtonStyle,
  color: 'var(--error)',
  background: 'color-mix(in srgb, var(--error) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--error) 28%, transparent)',
};
