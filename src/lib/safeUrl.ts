/**
 * URL-Schema-Guard für extern verlinkte Inhalte aus Upstream-Quellen
 * (Airlabs Wiki, Planespotters Photos, etc.). Schützt vor
 * `javascript:`-, `data:`- und Custom-Scheme-Injection in `<a href>`,
 * falls eine vorgelagerte Schicht (Backend-Cache, kompromittierter
 * Upstream) einen bösartigen Wert durchreicht.
 *
 * Die `<a href="javascript:...">`-Klasse wird von CSP nicht blockiert —
 * sie ist kein `script-src`-Vektor in der Spec. Daher braucht jeder
 * dynamisch gebaute Link einen expliziten Schema-Check.
 */

const ALLOWED_SCHEMES = new Set(['https:', 'http:']);

export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!ALLOWED_SCHEMES.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
