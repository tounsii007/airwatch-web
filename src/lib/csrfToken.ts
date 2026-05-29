/**
 * Module-scoped CSRF token store.
 *
 * <h3>Why a closure, not {@code window.__AIRWATCH_CSRF__}</h3>
 * The previous implementation stashed the live CSRF token on a
 * well-known global on the {@code window} object. Anything in the page
 * (a third-party analytics script, a browser extension content script,
 * a future inadvertent inline {@code <script>}) could read it via
 * {@code window.__AIRWATCH_CSRF__} and forge an authenticated POST
 * against {@code /admin/*}.
 *
 * Holding the token in a module-level {@code let} that's only reachable
 * through the exported {@link getCsrfToken}/{@link setCsrfToken}
 * functions removes that read surface: external scripts can call other
 * functions in the same realm, but they can't enumerate the module's
 * lexical bindings.
 *
 * <h3>Notes</h3>
 *   * This is best-effort hardening, not a full defence. A malicious
 *     same-origin script can still call {@link getCsrfToken} if it can
 *     resolve the import. Defence-in-depth: CSP nonce on every inline
 *     script (see proxy.ts) closes the easy injection path.
 *   * On a hard navigation the module is re-evaluated and the token
 *     starts as {@code null}. {@link SessionHeartbeat} repopulates it
 *     on mount.
 *   * Server-side / SSR: this module loads cleanly under Node but the
 *     token is always {@code null} there — server code should never
 *     call {@link getCsrfToken}.
 */

let csrfToken: string | null = null;

/** Replace the stored token. Pass {@code null} to clear. */
export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

/** Read the current token. {@code null} if not yet populated. */
export function getCsrfToken(): string | null {
  return csrfToken;
}
