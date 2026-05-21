/**
 * Keyboard-key glyph. Mirrors the inline `<kbd>` style we already use in
 * the Cmd+K shortcut hint, but typed and reusable. Accepts a single
 * string ("⌘K", "Esc") or a sequence ("Cmd", "K") rendered as separate
 * keycaps joined by a hair-space.
 *
 *   <Kbd>⌘K</Kbd>
 *   <Kbd keys={['Shift', 'Enter']} />
 */

export function Kbd({
  children,
  keys,
  className = '',
}: {
  children?: string;
  keys?: readonly string[];
  className?: string;
}) {
  const items = keys ?? (children ? [children] : []);
  if (items.length === 0) return null;

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {items.map((k, i) => (
        <kbd
          key={`${k}-${i}`}
          className="t-meta t-mono font-bold px-1.5 py-0.5 rounded bg-white/5 border border-[var(--glass-border)] text-[var(--text-secondary)]"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
