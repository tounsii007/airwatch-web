/**
 * Empty-state primitive — replaces the generic "No data yet" text
 * that pages used to show with a structured message + icon + optional
 * call-to-action.
 *
 * Visual: centred icon (60×60 muted blob), title, hint text, optional
 * action button. Designed to read at-a-glance without an operator
 * wondering "is the page broken or is there really no data?"
 */

interface Props {
  /**
   * Single emoji or short glyph rendered as the visual anchor.
   * Defaults to 〰 (a calm wave) so an empty page looks intentional
   * rather than scary.
   */
  icon?: string;
  title: string;
  hint?: string;
  /** Optional CTA — { label, href } pair. */
  action?: { label: string; href: string };
  /** Variant. 'calm' = neutral grey, 'warning' = amber, 'error' = red. */
  tone?: 'calm' | 'warning' | 'error';
}

const TONE_COLOR: Record<NonNullable<Props['tone']>, string> = {
  calm:    'var(--text-muted)',
  warning: 'var(--warning)',
  error:   'var(--error)',
};

export function EmptyState({ icon = '〰', title, hint, action, tone = 'calm' }: Props) {
  const color = TONE_COLOR[tone];
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
        gap: '0.6rem',
        textAlign: 'center',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `color-mix(in srgb, ${color} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
          color,
          fontSize: '1.6rem',
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.875rem',
          letterSpacing: '0.05em',
          color: 'var(--text-primary)',
          marginTop: 4,
        }}
      >
        {title}
      </div>
      {hint && (
        <div style={{
          color: 'var(--text-muted)',
          fontSize: '0.8125rem',
          maxWidth: 380,
          lineHeight: 1.5,
        }}>
          {hint}
        </div>
      )}
      {action && (
        <a
          href={action.href}
          style={{
            marginTop: '0.5rem',
            fontFamily: 'var(--font-heading)',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--primary-bright)',
            background: 'color-mix(in srgb, var(--primary-bright) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--primary-bright) 28%, transparent)',
            padding: '0.4rem 0.95rem',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
