'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { FlightStatEntry } from '@/lib/stores/statsStore';

type ExportFormat = 'json' | 'csv';

interface Props {
  flights: FlightStatEntry[];
  totalViews: number;
  language: AppLanguage;
}

/**
 * Escape a CSV field — wrap in double quotes when it contains a comma,
 * quote, or newline, and double any embedded quotes per RFC 4180.
 */
function csvField(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(flights: FlightStatEntry[]): string {
  const header = ['icao24', 'callsign', 'airlineIcao', 'depIata', 'arrIata', 'viewCount', 'firstSeenAt', 'lastSeenAt'];
  const rows = flights.map((f) => [
    csvField(f.icao24),
    csvField(f.callsign),
    csvField(f.airlineIcao),
    csvField(f.depIata),
    csvField(f.arrIata),
    csvField(f.viewCount),
    csvField(new Date(f.firstSeenAt).toISOString()),
    csvField(new Date(f.lastSeenAt).toISOString()),
  ].join(','));
  return [header.join(','), ...rows].join('\n');
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Dropdown that exports the local stats as JSON or CSV. Files are
 * generated entirely client-side — nothing leaves the browser.
 */
export function ExportButton({ flights, totalViews, language }: Props) {
  const [open, setOpen] = useState(false);

  const download = (format: ExportFormat) => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      const payload = {
        exportedAt: new Date().toISOString(),
        totalViews,
        flights,
      };
      downloadBlob(JSON.stringify(payload, null, 2), 'application/json', `airwatch-stats-${stamp}.json`);
    } else {
      downloadBlob(toCsv(flights), 'text/csv', `airwatch-stats-${stamp}.csv`);
    }
    setOpen(false);
  };

  if (flights.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--glass-border)] hover:border-[color-mix(in_srgb,var(--primary)_45%,transparent)] transition-colors cursor-pointer"
      >
        <Download size={13} />
        {t('export', language)}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 mt-1 z-20 min-w-[7rem] rounded-lg border border-[var(--glass-border)] bg-[var(--bg-elevated,var(--bg))] shadow-lg overflow-hidden"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => download('json')}
              className="block w-full text-left px-3 py-1.5 text-xs font-[var(--font-body)] text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] cursor-pointer"
            >
              JSON
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => download('csv')}
              className="block w-full text-left px-3 py-1.5 text-xs font-[var(--font-body)] text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] cursor-pointer"
            >
              CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
}
