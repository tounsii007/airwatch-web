/**
 * Webhook configuration + test card.
 *
 * <p>The webhook URL is configured via env (AIRWATCH_WEBHOOK_URL) and
 * is intentionally NOT editable from the dashboard — it's a deploy-time
 * secret. This card is a read-only status indicator + a "Send test"
 * button so an operator can confirm the wiring without searching logs.
 *
 * <p>The test endpoint posts a real `AirWatch test alert` payload
 * through the configured sink and returns the upstream HTTP status.
 * Anything in 2xx → green, 4xx/5xx or network error → red, "not
 * configured" → calm grey.
 */
'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/app/(admin)/Toast';

// Mask the path portion of a webhook URL so a shoulder-surfer or screen
// share can't capture the secret token segments. The host is left intact
// (operators need to know which sink it points at — Slack vs Discord vs
// generic), but everything after it collapses to *** placeholders.
//
// Example input:  https://hooks.slack.com/services/T123/B456/abc
// Example output: https://hooks.slack.com/services/T***/B***/***
function maskWebhookUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const masked = u.pathname
      .split('/')
      .map((segment) => {
        if (!segment) return segment;
        // Preserve a one-character prefix (e.g. Slack's T/B route hints)
        // so the channel type is still recognisable without leaking
        // the token suffix.
        const first = segment[0];
        return /[A-Za-z]/.test(first) && segment.length > 1
          ? `${first}***`
          : '***';
      })
      .join('/');
    return `${u.origin}${masked}`;
  } catch {
    // Not a parseable URL — fully redact rather than risk leaking.
    return '***';
  }
}

interface WebhookStatus {
  enabled: boolean;
  url:     string;
  format:  string;
}

interface TestResult {
  ok:          boolean;
  statusCode:  number;
  bodyPreview: string;
  error:       string | null;
}

export function WebhookCard({ csrfToken }: { csrfToken: string }) {
  const toast = useToast();
  const [status, setStatus] = useState<WebhookStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/admin/api/webhook', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((s: WebhookStatus) => { if (!cancelled) setStatus(s); })
      .catch(() => { if (!cancelled) setStatus({ enabled: false, url: '', format: '?' }); });
    return () => { cancelled = true; };
  }, []);

  async function sendTest() {
    if (busy) return;
    setBusy(true);
    setLastResult(null);
    try {
      const res = await fetch('/admin/api/webhook/test', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      const body = await res.json() as TestResult;
      setLastResult(body);
      if (body.ok) {
        toast.success(`Webhook test ok (HTTP ${body.statusCode})`);
      } else if (body.error) {
        toast.error(`Webhook test failed: ${body.error}`);
      } else {
        toast.error(`Webhook test failed (HTTP ${body.statusCode})`);
      }
    } catch (ex) {
      toast.error(`Network error: ${ex instanceof Error ? ex.message : ex}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card">
      <h2>Webhook</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
        Outbound channel for ops alerts (Slack / Discord / generic). Configured via{' '}
        <code style={inlineCode}>AIRWATCH_WEBHOOK_URL</code> at deploy time. Use the test button to
        confirm the URL works without waiting for a real alert.
      </p>

      {status === null ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading status…</p>
      ) : !status.enabled ? (
        <div style={infoRowStyle('var(--text-muted)')}>
          <span style={{ ...badgeStyle, color: 'var(--text-muted)' }}>NOT CONFIGURED</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            Set <code style={inlineCode}>AIRWATCH_WEBHOOK_URL</code> in the api environment to enable.
          </span>
        </div>
      ) : (
        <>
          <div style={infoRowStyle('var(--success)')}>
            <span style={{ ...badgeStyle, color: 'var(--success)' }}>ENABLED</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              <code style={inlineCode}>{maskWebhookUrl(status.url)}</code>
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              format: <strong>{status.format}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => void sendTest()}
              disabled={busy}
              style={{ ...primaryButtonStyle, opacity: busy ? 0.4 : 1 }}
            >
              {busy ? 'Sending…' : 'Send test alert'}
            </button>
            {lastResult && (
              <span style={{
                fontSize: '0.75rem',
                color: lastResult.ok ? 'var(--success)' : 'var(--error)',
              }}>
                {lastResult.ok
                  ? `✓ HTTP ${lastResult.statusCode}`
                  : lastResult.error
                    ? `✗ ${lastResult.error}`
                    : `✗ HTTP ${lastResult.statusCode}`}
              </span>
            )}
          </div>
          {lastResult?.bodyPreview && (
            <pre style={{
              marginTop: '0.5rem',
              padding: '0.6rem 0.85rem',
              background: 'var(--sunken)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              maxHeight: 120,
              overflow: 'auto',
              fontFamily: 'monospace',
            }}>
              {lastResult.bodyPreview}
            </pre>
          )}
        </>
      )}
    </section>
  );
}

function infoRowStyle(borderColor: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
    padding: '0.6rem 0.85rem',
    borderRadius: 4,
    background: `color-mix(in srgb, ${borderColor} 6%, transparent)`,
    border: `1px solid color-mix(in srgb, ${borderColor} 24%, transparent)`,
  };
}

const inlineCode = { color: 'var(--primary-bright)', fontSize: '0.75rem', background: 'var(--sunken)', padding: '1px 6px', borderRadius: 3 };
const badgeStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  fontWeight: 700,
  padding: '2px 8px',
  border: '1px solid currentColor',
  borderRadius: 3,
};
const primaryButtonStyle = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.7rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 28%, transparent)',
  padding: '0.5rem 1rem',
  borderRadius: 4,
  cursor: 'pointer' as const,
};
