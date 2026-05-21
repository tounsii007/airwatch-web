'use client';

import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';
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
  const language = useSettingsStore((s) => s.language);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    if (fences.length === 0) {
      setStatus({ tone: 'info', text: t('fence_export_empty', language) });
      return;
    }
    const envelope = buildExportEnvelope(fences);
    downloadExportFile(envelope);
    const template = fences.length === 1
      ? t('fence_exported_one', language)
      : t('fence_exported_many', language);
    setStatus({ tone: 'ok', text: template.replace('{0}', String(fences.length)) });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the value so re-selecting the same file fires `change` again.
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setStatus({ tone: 'info', text: t('fence_reading_file', language) });

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
        const template = summary.ok === 1
          ? t('fence_imported_one', language)
          : t('fence_imported_many', language);
        setStatus({ tone: 'ok', text: template.replace('{0}', String(summary.ok)) });
      } else {
        setStatus({
          tone: 'err',
          text: t('fence_imported_partial', language)
            .replace('{0}', String(summary.ok))
            .replace('{1}', String(summary.failed))
            .replace('{2}', summary.errors[0] ?? '—'),
        });
      }
    } catch (err) {
      setStatus({
        tone: 'err',
        text: t('fence_read_failed', language).replace('{0}', (err as Error).message),
      });
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
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={<Download size={11} />}
        onClick={handleExport}
        title={t('fence_export_tooltip', language)}
      >
        {t('export', language)}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={<Upload size={11} />}
        onClick={handleImportClick}
        disabled={busy}
        loading={busy}
        title={t('fence_import_tooltip', language)}
      >
        {busy ? t('fence_importing_button', language) : t('fence_import_button', language)}
      </Button>
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
