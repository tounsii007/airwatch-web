/**
 * Phase-3 roadmap teaser — dashed-border "coming next" card so the
 * operator knows what's deliberately missing rather than wondering
 * if it's broken. Lives in its own file so updating the list when
 * Phase 3 ships (or removing it entirely) doesn't touch the page.
 */
const ITEMS = [
  'Email alerts on instance failure with detail counts',
  'Critical-error rolling-window sweep + dashboard panel',
  'Docker stats integration for web/mobile load curves',
  'Watchdog for nginx / postgres / web outage emails',
  'Per-IP unauthorised-attempt email on threshold breach',
  'Multi-day country / view trend curves',
] as const;

export function Phase3Teaser() {
  return (
    <section className="admin-card" style={{ borderStyle: 'dashed', opacity: 0.7 }}>
      <h2>Coming in Phase 3</h2>
      <ul
        style={{
          listStyle: 'none',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '0.5rem',
          fontSize: '0.8125rem',
          color: 'var(--text-secondary)',
        }}
      >
        {ITEMS.map((it) => (
          <li key={it}>· {it}</li>
        ))}
      </ul>
    </section>
  );
}
