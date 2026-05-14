'use client';

import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import type { GeoFence } from '@/lib/flights/geofence';
import { getOrCreateClientId } from '@/lib/flights/geofence';
import {
  adoptForLocalClient,
  buildExportEnvelope,
  downloadExportFile,
  parseImportFile,
} from '@/app/(public)/geofences/fenceIO';

interface ImportSummary {
  ok: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface Props {
  fences: GeoFence[];
  /** Async creator from useFences(). Re-used here so import goes through the
   *  same validation + state refresh as the manual form. */
  onImport: (fence: GeoFence) => Promise<boolean>;
}

/**
 * Export / Import toolbar at the top of the fences list.
 *   • Export → downloads airwatch-fences.json with the user's fences.
 *   • Import → reads a previously-exported JSON file, validates each
 *     entry against GeoFenceSchema (via parseImportFile), then POSTs
 *     each fence through the existing create() pipeline.
 *
 * Errors are surfaced inline as a small status line under the buttons —
 * we never let a malformed file silently fail.
 */
export function FenceIOToolbar({ fences, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    if (fences.length === 0) {
      setStatus({ tone: 'info', text: 'No fences to export.' });
      return;
    }
    const envelope = buildExportEnvelope(fences);
    downloadExportFile(envelope);
    setStatus({ tone: 'ok', text: `Exported ${fences.length} fence${fences.length === 1 ? '' : 's'}.` });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the value so re-selecting the same file fires `change` again.
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setStatus({ tone: 'info', text: 'Reading file…' });

    try {
      const text = await file.text();
      const parsed = parseImportFile(text);
      if (!parsed.ok) {
        setStatus({ tone: 'err', text: parsed.error });
        return;
      }
      const clientId = getOrCreateClientId();
      const summary: ImportSummary = { ok: 0, failed: 0, skipped: 0, errors: [] };
      for (const imported of parsed.envelope.fences) {
        try {
          const ok = await onImport(adoptForLocalClient(imported, clientId));
          if (ok) summary.ok++;
          else { summary.failed++; summary.errors.push(`Backend rejected "${imported.name}"`); }
        } catch (err) {
          summary.failed++;
          summary.errors.push(`"${imported.name}": ${(err as Error).message}`);
        }
      }
      if (summary.failed === 0) {
        setStatus({ tone: 'ok', text: `Imported ${summary.ok} fence${summary.ok === 1 ? '' : 's'}.` });
      } else {
        setStatus({
          tone: 'err',
          text: `Imported ${summary.ok}, ${summary.failed} failed. First error: ${summary.errors[0] ?? '—'}`,
        });
      }
    } catch (err) {
      setStatus({ tone: 'err', text: `Failed to read file: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = () => {
    setStatus(null);
    fileRef.current?.click();
  };

  const toneClass =
    status?.tone === 'ok'
      ? 'text-[var(--success)]'
      : status?.tone === 'err'
        ? 'text-[var(--error)]'
        : 'text-[var(--text-muted)]';

  return (
    <div className="mb-3 flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-1 text-[10px] font-[var(--font-heading)] tracking-wider px-2 py-1 border border-[var(--glass-border)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] text-[var(--text-muted)] rounded transition-colors"
        title="Download all fences as JSON"
      >
        <Download size={11} /> EXPORT
      </button>
      <button
        type="button"
        onClick={handleImportClick}
        disabled={busy}
        className="inline-flex items-center gap-1 text-[10px] font-[var(--font-heading)] tracking-wider px-2 py-1 border border-[var(--glass-border)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)] text-[var(--text-muted)] rounded transition-colors disabled:opacity-50"
        title="Import fences from a previously-exported JSON file"
      >
        <Upload size={11} /> {busy ? 'IMPORTING…' : 'IMPORT'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Import fences JSON file"
      />
      {status && (
        <span className={`text-[10px] ${toneClass}`} role="status" aria-live="polite">
          {status.text}
        </span>
      )}
    </div>
  );
}
