'use client';

/**
 * Admin-config backup + restore (Phase 6).
 *
 * Three actions:
 *   1. Export — downloads a signed JSON of admin_settings, mutes,
 *      probes, webhooks (secrets redacted). Browsers save-as.
 *   2. Preview — operator picks a backup file; we POST it for parse +
 *      HMAC verify and show the diff before any DB write.
 *   3. Apply — same payload, this time mutating. Counts are surfaced
 *      so the operator sees "added 12 settings, updated 3 probes, ...".
 *
 * The two-step preview/apply is deliberate. A fat-fingered operator
 * picking yesterday's backup file shouldn't immediately wipe today's
 * tuning — the preview gives them a chance to bail.
 */

import { useRef, useState } from 'react';
import { useToast } from '@/app/(admin)/Toast';

interface PreviewDiff {
  settings: { toAdd: number; toUpdate: number };
  mutes:    { toAdd: number; alreadyActive: number };
  probes:   { toAdd: number; toUpdate: number };
  webhooks: { toAdd: number; toUpdate: number; secretsNeedReset: number };
}

interface PreviewResult {
  ok: boolean;
  error: string | null;
  diff: { version: number; generatedAt: string | null; diff: PreviewDiff } | null;
}

interface RestoreResult {
  ok: boolean;
  error: string | null;
  applied: Record<string, number>;
}

interface Props {
  csrfToken: string;
}

export function BackupSection({ csrfToken }: Props) {
  const [busy, setBusy] = useState(false);
  const [stagedBody, setStagedBody] = useState<string | null>(null);
  const [stagedFilename, setStagedFilename] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applied, setApplied] = useState<RestoreResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function handleExport() {
    if (!csrfToken) {
      toast.error('CSRF token missing — refresh the page');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/admin/api/system/backup`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'X-CSRF-Token': csrfToken },
      });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        toast.error(`Export failed (${res.status}) ${err}`);
        return;
      }
      const blob = await res.blob();
      // Use the server-supplied filename when present.
      const dispo = res.headers.get('Content-Disposition') ?? '';
      const m = /filename="([^"]+)"/.exec(dispo);
      const filename = m ? m[1] : `airwatch-admin-backup-${Date.now()}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${filename}`);
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleFilePicked(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setPreview(null);
    setApplied(null);
    try {
      const text = await file.text();
      setStagedBody(text);
      setStagedFilename(file.name);
      // Auto-preview as soon as the file is read.
      await runPreview(text);
    } catch (e) {
      toast.error(`Read failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function runPreview(body: string) {
    if (!csrfToken) return;
    const res = await fetch(`/admin/api/system/backup/preview`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body,
    });
    const result = (await res.json()) as PreviewResult;
    setPreview(result);
    if (!result.ok) toast.error(`Preview rejected: ${result.error}`);
  }

  async function handleApply() {
    if (!stagedBody || !csrfToken) return;
    if (!confirm('Apply this backup? Settings, mutes, probes and webhooks will be upserted.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/admin/api/system/backup/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: stagedBody,
      });
      const result = (await res.json()) as RestoreResult;
      setApplied(result);
      if (result.ok) {
        const summary = Object.entries(result.applied)
                             .map(([k, n]) => `${n} ${k}`).join(', ');
        toast.success(`Restored: ${summary}`);
      } else {
        toast.error(`Restore failed: ${result.error}`);
      }
    } catch (e) {
      toast.error(`Restore failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function handleClear() {
    setStagedBody(null);
    setStagedFilename(null);
    setPreview(null);
    setApplied(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <section className="admin-card">
      <h2>Backup &amp; Restore</h2>
      <p style={hintStyle}>
        Signed JSON dump of admin settings, alert mutes, synthetic probes and
        webhook configurations. Webhook secrets are <strong>redacted</strong>
        on export — restore uses placeholders the operator must replace.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button type="button" onClick={() => void handleExport()} disabled={busy}
                style={primaryBtn}>
          ⬇ Export current config
        </button>
        <label style={secondaryBtn}>
          ⬆ Upload backup to preview
          <input ref={fileRef} type="file" accept="application/json,.json"
                 onChange={(e) => void handleFilePicked(e)}
                 style={{ display: 'none' }} disabled={busy} />
        </label>
        {stagedBody && (
          <button type="button" onClick={handleClear} disabled={busy} style={ghostBtn}>
            Clear
          </button>
        )}
      </div>

      {stagedFilename && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          File: <code>{stagedFilename}</code> ({stagedBody?.length ?? 0} bytes)
        </p>
      )}

      {preview && !preview.ok && (
        <div style={errorBoxStyle}>
          <strong>Preview rejected:</strong> {preview.error}
        </div>
      )}

      {preview?.ok && preview.diff && (
        <div style={previewBoxStyle}>
          <strong>Preview</strong>
          <ul style={diffListStyle}>
            <li><code>v{preview.diff.version}</code>, generated <code>{preview.diff.generatedAt}</code></li>
            <li><strong>Settings:</strong> +{preview.diff.diff.settings.toAdd} new, ~{preview.diff.diff.settings.toUpdate} updated</li>
            <li><strong>Mutes:</strong> +{preview.diff.diff.mutes.toAdd} new, {preview.diff.diff.mutes.alreadyActive} already active</li>
            <li><strong>Probes:</strong> +{preview.diff.diff.probes.toAdd} new, ~{preview.diff.diff.probes.toUpdate} updated</li>
            <li>
              <strong>Webhooks:</strong> +{preview.diff.diff.webhooks.toAdd} new, ~{preview.diff.diff.webhooks.toUpdate} updated;
              {' '}<span style={{ color: 'var(--warning)' }}>
                {preview.diff.diff.webhooks.secretsNeedReset} need re-set after apply
              </span>
            </li>
          </ul>
          <button type="button" onClick={() => void handleApply()} disabled={busy}
                  style={applyBtn}>
            ⚠ Apply restore
          </button>
        </div>
      )}

      {applied && applied.ok && (
        <div style={successBoxStyle}>
          <strong>Restore applied</strong>
          <ul style={diffListStyle}>
            {Object.entries(applied.applied).map(([k, n]) => (
              <li key={k}><strong>{k}:</strong> {n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const hintStyle: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: '0.8125rem',
  maxWidth: 680,
  marginTop: 4,
};

const primaryBtn: React.CSSProperties = {
  fontFamily: 'var(--font-heading)',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--primary-bright)',
  background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
  border: '1px solid color-mix(in srgb, var(--primary-bright) 28%, transparent)',
  padding: '8px 14px',
  borderRadius: 3,
  cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  ...primaryBtn,
  color: 'var(--text-secondary)',
  background: 'var(--sunken)',
  borderColor: 'var(--border)',
  display: 'inline-flex',
  alignItems: 'center',
};
const ghostBtn: React.CSSProperties = {
  ...primaryBtn,
  color: 'var(--text-muted)',
  background: 'transparent',
};
const applyBtn: React.CSSProperties = {
  ...primaryBtn,
  color: 'var(--warning)',
  background: 'color-mix(in srgb, var(--warning) 14%, transparent)',
  borderColor: 'color-mix(in srgb, var(--warning) 32%, transparent)',
  marginTop: '0.75rem',
};

const previewBoxStyle: React.CSSProperties = {
  marginTop: '1rem',
  padding: '12px',
  background: 'var(--sunken)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  fontSize: '0.8125rem',
};
const successBoxStyle: React.CSSProperties = {
  ...previewBoxStyle,
  background: 'color-mix(in srgb, var(--success) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--success) 24%, transparent)',
};
const errorBoxStyle: React.CSSProperties = {
  ...previewBoxStyle,
  background: 'color-mix(in srgb, var(--error) 8%, transparent)',
  border: '1px solid color-mix(in srgb, var(--error) 24%, transparent)',
};
const diffListStyle: React.CSSProperties = {
  paddingLeft: '1.25rem',
  margin: '0.5rem 0',
  lineHeight: 1.7,
};
