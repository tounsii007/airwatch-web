// Externalised from offline.html so the page can keep a strict CSP
// (no `'unsafe-inline'` in script-src) — moving the body here lets us
// drop the inline <script> while preserving the behaviour: when the
// browser regains connectivity, reload the page so the SPA can take
// over again.
window.addEventListener('online', function () {
  window.location.reload();
});
