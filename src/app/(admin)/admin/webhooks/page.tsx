/**
 * Outbound webhook management (Phase 5).
 *
 * Operator-defined HTTP escalation targets — PagerDuty, OpsGenie,
 * Slack incoming webhooks, internal ticketing endpoints. The list
 * below shows every registered webhook, its kind/severity filter,
 * recent counter rolls, and the last delivery outcome.
 */
import { fetchJson, fetchCsrfToken } from '@/app/(admin)/admin/dashboard/fetcher';
import { KpiCard } from '@/app/(admin)/admin/shared/components/KpiCard';
import { HelpPanel } from '@/app/(admin)/admin/shared/components/HelpPanel';
import { WebhooksClient } from '@/app/(admin)/admin/webhooks/WebhooksClient';

interface Webhook {
  id: number;
  name: string;
  url: string;
  secretMasked: string;
  kindFilter: string | null;
  severityFilter: string | null;
  enabled: boolean;
  createdAt: string | null;
  createdBy: string | null;
  lastCalledAt: string | null;
  lastStatus: number | null;
  lastError: string | null;
  successCount: number;
  failureCount: number;
}

const RUNBOOK = `
# Outbound webhooks
Active escalation channel — alerts that match a webhook's filter are
POSTed to the registered URL alongside the standard email send.

# Filter syntax
- **Kind filter**: a Java regex over the alert kind. Empty = all kinds.
  Example: \`instance_down|synthetic_probe\` for infra-only events.
- **Severity filter**: comma-separated list. Empty = all severities.
  Example: \`critical\` for PagerDuty-grade pages only.

# Signing
Every request carries an \`X-Airwatch-Signature: sha256=<hex>\` header
containing HMAC-SHA256(body, secret). Receivers MUST verify
constant-time before trusting the payload — without this a
compromised firewall rule could spoof alerts. The secret is shown
in full once at create time; afterwards only the first 4 chars
appear in the list view.

# Retry semantics
Up to 3 attempts with exponential backoff (1s, 5s, 25s). 4xx (except
408 / 429) terminate immediately — receiver said "stop".

# Tips
- Use the **Test** action after creating a webhook to confirm the
  receiver accepts the payload before relying on it for real alerts.
- Disabled webhooks are skipped at dispatch time but kept on the list
  for audit; delete only when you're sure the integration is gone.
`;

export default async function WebhooksPage() {
  const [data, csrfToken] = await Promise.all([
    fetchJson<Webhook[]>('/admin/api/webhooks'),
    fetchCsrfToken(),
  ]);

  const webhooks = data ?? [];
  const enabled  = webhooks.filter(w => w.enabled).length;
  const failing  = webhooks.filter(w =>
    w.failureCount > 0 && w.lastError !== null
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <header>
        <h1 style={headingStyle}>Webhooks</h1>
        <p style={subtitleStyle}>
          HMAC-signed outbound HTTP escalation alongside email. Configure
          per-kind / per-severity routing for PagerDuty, OpsGenie, Slack,
          or any JSON-receiving endpoint.
        </p>
      </header>

      <HelpPanel pageId="webhooks" markdown={RUNBOOK} />

      <div style={kpiGridStyle}>
        <KpiCard label="REGISTERED" value={webhooks.length} hint="Total webhooks (any state)" />
        <KpiCard label="ENABLED"    value={enabled}        tone="info"
                 hint="Will fan out on matching alerts" />
        <KpiCard label="FAILING"    value={failing}
                 tone={failing > 0 ? 'error' : 'success'}
                 hint={failing > 0
                   ? 'At least one webhook had a failed delivery'
                   : 'All webhooks last delivered cleanly'} />
      </div>

      <WebhooksClient initialWebhooks={webhooks} csrfToken={csrfToken} />
    </div>
  );
}

const headingStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '1.5rem',
  letterSpacing: '0.04em',
  color: 'var(--primary-bright)',
};
const subtitleStyle = {
  color: 'var(--text-muted)',
  fontSize: '0.8125rem',
  marginTop: 4,
  maxWidth: 720,
};
const kpiGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0.75rem',
};
