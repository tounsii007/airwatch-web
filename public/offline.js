// Externalised from offline.html so the page can keep a strict CSP
// (no `'unsafe-inline'` in script-src) — moving the body here lets us
// drop the inline <script> while preserving the behaviour: when the
// browser regains connectivity, reload the page so the SPA can take
// over again.
window.addEventListener('online', function () {
  window.location.reload();
});

// Retry-button handler. The inline onclick on the <button> was the
// last CSP escape-hatch on this page; binding via addEventListener
// keeps script-src strict (no 'unsafe-inline' needed even for the
// fallback offline shell).
document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('retry-btn');
  if (btn) btn.addEventListener('click', function () { window.location.reload(); });
});
