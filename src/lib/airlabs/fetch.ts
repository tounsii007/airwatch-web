/**
 * Typed fetcher for the Airlabs proxy endpoints.
 *
 * <h3>Why this layer exists</h3>
 * Every Airlabs proxy call follows the same pattern: hit the URL, parse the
 * JSON envelope, validate it with Zod, drop bad rows but stream the good
 * ones, classify upstream-error responses (429 quota, 5xx outage). Pulling
 * this into one helper means every consumer gets the same robust handling
 * with one line of caller code.
 *
 * <h3>Error classification</h3>
 * Returns a discriminated union so callers can render meaningful UI states
 * — "rate limited" vs "no results" vs "outage" — instead of just "failed".
 */

import type { z } from 'zod';
import { apiFetch } from '@/lib/apiFetch';
import { safeParseArray, safeParse } from '@/lib/schemas';

/** Discriminated result — caller handles each case explicitly. */
export type AirlabsResult<T> =
  | { ok: true;  items: T[];  dropped: number }
  | { ok: false; error: AirlabsError };

export type AirlabsError =
  | 'network'
  | 'rate_limited'
  | 'quota_exhausted'
  | 'upstream_5xx'
  | 'invalid_input'
  | 'unauthorized'
  | 'schema_mismatch'
  | 'empty';

/**
 * Fetch + parse an array-shaped Airlabs proxy response.
 *
 * @param url       proxy URL (build with the {@code API} helpers in constants.ts)
 * @param itemSchema Zod schema for one row inside the {@code response[]} array
 * @param label     short tag for logs / error attribution
 */
export async function fetchAirlabsArray<T>(
  url: string,
  itemSchema: z.ZodType<T>,
  label: string,
  fetcher: typeof fetch = fetch,
): Promise<AirlabsResult<T>> {
  let res: Response;
  try {
    const f = fetcher === fetch ? apiFetch : fetcher;
    res = await f(url);
  } catch (e) {
    console.warn(`[airlabs:${label}] network error`, (e as Error).message);
    return { ok: false, error: 'network' };
  }

  // HTTP-level classification before we even look at the body.
  if (res.status === 401 || res.status === 403) return { ok: false, error: 'unauthorized' };
  if (res.status === 400) return { ok: false, error: 'invalid_input' };
  if (res.status === 429) return { ok: false, error: 'rate_limited' };
  if (res.status >= 500)  return { ok: false, error: 'upstream_5xx' };
  if (!res.ok)            return { ok: false, error: 'upstream_5xx' };

  let raw: unknown;
  try { raw = await res.json(); } catch { return { ok: false, error: 'schema_mismatch' }; }

  // Airlabs sometimes returns 200 with an in-body error object on quota
  // exhaustion or expired-key — classify that distinctly so the UI can
  // surface the right copy ("monthly quota used" vs generic "outage").
  const env = raw as { response?: unknown; error?: { code?: string; message?: string } };
  if (env.error?.code) {
    const code = env.error.code;
    if (code.includes('month_limit')) return { ok: false, error: 'quota_exhausted' };
    if (code.includes('limit'))       return { ok: false, error: 'rate_limited' };
    if (code.includes('forbidden') || code.includes('unauth')) return { ok: false, error: 'unauthorized' };
    return { ok: false, error: 'upstream_5xx' };
  }

  if (!Array.isArray(env.response)) return { ok: false, error: 'empty' };

  const { items, dropped } = safeParseArray(itemSchema, env.response, `airlabs:${label}`);
  return { ok: true, items, dropped };
}

/**
 * Fetch + parse a single-object Airlabs response (e.g. {@code /wiki}).
 * Same error-classification logic as the array variant.
 */
export async function fetchAirlabsOne<T>(
  url: string,
  itemSchema: z.ZodType<T>,
  label: string,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: true; item: T } | { ok: false; error: AirlabsError }> {
  // Reuse the array path to share the error classification.
  const wrapped = await fetchAirlabsArray<T>(
    url,
    // Wrap the item so the array helper can run — the unwrap happens below.
    itemSchema,
    label,
    fetcher === fetch ? fetch : fetcher,
  );

  // For object endpoints, Airlabs returns {response: <object>} not an array,
  // so the array helper will see a non-array and return 'empty'. Re-fetch
  // raw and parse against the object schema directly. (One extra round-trip
  // is acceptable here — we only do this for the very few object endpoints
  // and the response is small + cached.)
  if (wrapped.ok && wrapped.items.length > 0) {
    return { ok: true, item: wrapped.items[0] };
  }
  if (!wrapped.ok && wrapped.error !== 'empty') return wrapped;

  // Fall through: re-fetch as object envelope.
  let res: Response;
  try {
    const f = fetcher === fetch ? apiFetch : fetcher;
    res = await f(url);
  } catch {
    return { ok: false, error: 'network' };
  }
  if (!res.ok) return { ok: false, error: 'upstream_5xx' };
  let raw: unknown;
  try { raw = await res.json(); } catch { return { ok: false, error: 'schema_mismatch' }; }
  const env = raw as { response?: unknown };
  const item = safeParse(itemSchema, env.response, `airlabs:${label}`);
  if (!item) return { ok: false, error: 'schema_mismatch' };
  return { ok: true, item };
}
