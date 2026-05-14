/**
 * Export / import a set of geo-fences as JSON.
 *
 * Round-trip rules:
 *   - Exported file omits `id` and `clientId` — those are scoped to a
 *     specific backend row and browser instance. On import the client's
 *     own clientId is grafted on and the backend mints a fresh id.
 *   - `active` defaults to true on import.
 *   - The shape is validated with Zod (GeoFenceSchema) on import so we
 *     never POST garbage to the backend.
 *   - File format is a top-level object {version, exportedAt, fences}
 *     rather than a bare array — leaves room for a future migration
 *     without breaking existing exports.
 */

import { z } from 'zod';
import { GeoFenceSchema, type GeoFence } from '@/lib/schemas';

export const EXPORT_FILE_VERSION = 1;

/** Shape that a freshly-imported fence has BEFORE the import wrapper
 *  assigns the local clientId. clientId is omitted on export so the
 *  same file can be imported by any browser. */
export const ImportFenceSchema = GeoFenceSchema.omit({ id: true, clientId: true });
export type ImportFence = z.infer<typeof ImportFenceSchema>;

export const ExportEnvelopeSchema = z.object({
  version: z.literal(EXPORT_FILE_VERSION),
  exportedAt: z.string(),                // ISO instant
  fences: z.array(ImportFenceSchema),
});
export type ExportEnvelope = z.infer<typeof ExportEnvelopeSchema>;

/** Build the export envelope from the user's live fences. */
export function buildExportEnvelope(fences: readonly GeoFence[], nowMs: number = Date.now()): ExportEnvelope {
  return {
    version: EXPORT_FILE_VERSION,
    exportedAt: new Date(nowMs).toISOString(),
    fences: fences.map((f) => {
      // Strip per-instance fields. `id` would conflict with the
      // receiving backend's autoincrement; `clientId` belongs to the
      // current browser only.
      const copy = { ...f } as Partial<GeoFence>;
      delete copy.id;
      delete copy.clientId;
      return copy as ImportFence;
    }),
  };
}

/** Pretty-print the envelope and trigger a browser download. */
export function downloadExportFile(envelope: ExportEnvelope, filename = 'airwatch-fences.json'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer the revoke a tick — some browsers race the click event and
  // revoke the URL before the download dialog reads it.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export type ParseResult =
  | { ok: true; envelope: ExportEnvelope }
  | { ok: false; error: string };

/**
 * Parse + validate raw JSON text into a typed ExportEnvelope.
 * Returns a discriminated union so callers can show a friendly error
 * to the user rather than crashing on a malformed file.
 */
export function parseImportFile(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  const parsed = ExportEnvelopeSchema.safeParse(json);
  if (!parsed.success) {
    // Take the first issue as the user-visible error — Zod gives a path
    // like "fences.0.radiusKm" which is already helpful.
    const issue = parsed.error.issues[0];
    const path = issue?.path.join('.') ?? '(root)';
    return { ok: false, error: `Schema mismatch at ${path}: ${issue?.message ?? 'unknown'}` };
  }
  return { ok: true, envelope: parsed.data };
}

/**
 * Adopt an imported fence into the local browser's catalogue:
 *   - Force `active` to true so freshly-imported fences fire alerts.
 *   - Stamp the local clientId in.
 * Returns the GeoFence that should be POSTed to the backend.
 */
export function adoptForLocalClient(imported: ImportFence, clientId: string): GeoFence {
  return { ...imported, clientId, active: imported.active ?? true };
}
