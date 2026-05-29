/**
 * API Security — INTENTIONALLY NEUTERED.
 *
 * <h3>Why this is a no-op</h3>
 * The previous implementation computed an HMAC-SHA256 over the request
 * path using {@code process.env.NEXT_PUBLIC_API_SECRET} as the key. That
 * is a security anti-pattern:
 *
 *   1. Anything prefixed with {@code NEXT_PUBLIC_} is inlined into the
 *      client JavaScript bundle at build time. The "secret" was visible
 *      in every browser's DevTools → Sources → Network response, so it
 *      was not actually a secret. Any third party could compute a valid
 *      HMAC for any path.
 *   2. A signature that anyone can forge provides zero authentication
 *      and only creates false confidence on the server side.
 *
 * <h3>What this file does now</h3>
 * Exports a no-op {@link getAuthHeaders} and {@link withApiSecurity} so
 * existing callers ({@code apiFetch}) continue to compile without code
 * changes. Both return an empty / unchanged header set.
 *
 * <h3>If you need request signing in the future</h3>
 * Do it server-side. The Next.js standalone server, the nginx proxy, or
 * the Spring Boot backend (airwatch-api) all have access to real
 * server-only secrets that are never shipped to the browser. A signing
 * proxy in front of the upstream API is the right architectural place
 * for HMAC validation — never the client.
 */

/**
 * No-op stub. Always returns an empty header map. Kept as an async
 * function so callers that {@code await} the result don't need to
 * change.
 */
export async function getAuthHeaders(_path: string): Promise<Record<string, string>> {
  return {};
}

/**
 * No-op header passthrough. Returns the supplied headers unchanged.
 * Provided so callers can write {@code withApiSecurity(myHeaders)}
 * without conditional logic; any future server-side signing layer can
 * replace this implementation without touching call sites.
 */
export function withApiSecurity<T extends Record<string, string>>(headers: T): T {
  return headers;
}
