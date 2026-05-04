import Link from 'next/link';

/**
 * Admin-themed 404. Caught at the (admin) route-group level so unknown
 * /admin/* paths render in the admin shell instead of falling back to
 * the public not-found page (which would briefly look like the operator
 * left the admin tool).
 */
export default function AdminNotFound() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '4rem',
          fontWeight: 700,
          color: 'var(--error)',
          letterSpacing: '0.02em',
          textShadow: '0 0 24px color-mix(in srgb, var(--error) 35%, transparent)',
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.25rem',
          letterSpacing: '0.04em',
          color: 'var(--primary-bright)',
          margin: 0,
        }}
      >
        Admin route not found
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 420 }}>
        The path you tried doesn&rsquo;t exist in the admin console.
        Use the nav above to get back to a known view.
      </p>
      <Link
        href="/admin/dashboard"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--primary-bright)',
          background: 'color-mix(in srgb, var(--primary-bright) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--primary-bright) 28%, transparent)',
          padding: '0.5rem 1rem',
          borderRadius: 4,
          marginTop: '0.5rem',
          textDecoration: 'none',
        }}
      >
        ← Back to dashboard
      </Link>
    </div>
  );
}
