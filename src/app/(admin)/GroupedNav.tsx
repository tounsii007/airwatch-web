/**
 * Hierarchical, hover-driven nav for the admin shell. (Phase 3.6 layout)
 *
 * Replaces the flat single-row of every link with 4 grouped dropdowns:
 *   * Live     — Ports, Security, Health, Instances, Probes, Incidents
 *   * Metrics  — Endpoints, Users, Features, Events, Quota
 *   * Tools    — Errors, Cache, Jobs, JVM, Audit
 *   * System   — Settings
 *
 * <h3>Why dropdowns</h3>
 * The flat row was wrapping at narrow widths and pushing the
 * AutoRefresh + Logout off-screen. Grouping into 4 buckets fits any
 * viewport ≥ 640px on a single line, and the dropdown panels can hold
 * longer translated labels (e.g. "Prüfprotokoll", "Geplante Wartungs-
 * fenster") without truncating.
 *
 * <h3>Server component</h3>
 * Renders to plain HTML — the dropdown show/hide is CSS-driven via
 * :hover and :focus-within (see .admin-nav-dropdown in admin.css), so
 * there's no JS state, no hydration, no client bundle weight.
 *
 * <h3>i18n</h3>
 * Takes a {@code t()} translator passed from the layout. Each visible
 * label is a translation key, so DE / EN flips both the group titles
 * and the link labels in lockstep.
 */
import Link from 'next/link';
import type { LocaleCode } from '@/app/(admin)/i18n/messages';
import { translate } from '@/app/(admin)/i18n/messages';

interface NavGroup {
  /** Translation key for the group's trigger button. */
  titleKey: string;
  links: Array<{
    href: string;
    /** Translation key for the link label. */
    labelKey: string;
    /** Optional title attribute (for icon-only or technical labels). */
    titleKey?: string;
    /** External target hint — e.g. for the JVM (Spring Boot Admin) link. */
    external?: boolean;
  }>;
}

const GROUPS: NavGroup[] = [
  {
    titleKey: 'nav.group.live',
    links: [
      { href: '/admin/ports',     labelKey: 'nav.ports'     },
      { href: '/admin/security',  labelKey: 'nav.security'  },
      { href: '/admin/health',    labelKey: 'nav.health'    },
      { href: '/admin/instances', labelKey: 'nav.instances' },
      { href: '/admin/probes',    labelKey: 'nav.probes'    },
      { href: '/admin/incidents', labelKey: 'nav.incidents' },
    ],
  },
  {
    titleKey: 'nav.group.metrics',
    links: [
      { href: '/admin/endpoints', labelKey: 'nav.endpoints' },
      { href: '/admin/users',     labelKey: 'nav.users'     },
      { href: '/admin/features',  labelKey: 'nav.features'  },
      { href: '/admin/events',    labelKey: 'nav.events'    },
      { href: '/admin/quota',     labelKey: 'nav.quota'     },
    ],
  },
  {
    titleKey: 'nav.group.tools',
    links: [
      { href: '/admin/errors',  labelKey: 'nav.errors' },
      { href: '/admin/cache',   labelKey: 'nav.cache'  },
      { href: '/admin/jobs',    labelKey: 'nav.jobs'   },
      { href: '/admin/security', labelKey: 'nav.audit' },
      // External — opens the standalone Spring Boot Admin server. Keep
      // its label as the technical "JVM" so operators know it's the
      // JVM-internals surface (env, threaddump, heapdump).
      { href: '/admin/sba/',    labelKey: 'nav.jvm', external: true },
    ],
  },
  {
    titleKey: 'nav.group.system',
    links: [
      { href: '/admin/system',   labelKey: 'nav.system'   },
      { href: '/admin/settings', labelKey: 'nav.settings' },
    ],
  },
];

export function GroupedNav({ locale }: { locale: LocaleCode }) {
  const t = (key: string) => translate(locale, key);
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {/* Dashboard sits outside the groups — it's the home / start page,
          and operators expect a single click to reach it. */}
      {/* Use next/link so client-side navigation kicks in (no full
          page reload). The other nav links inside the dropdown panels
          also use <a>, but those are nested-route links to /admin/*
          and Next handles them via the server-rendered shell. */}
      <Link href="/admin/dashboard" className="admin-nav-direct">{t('nav.dashboard')}</Link>

      {GROUPS.map(group => (
        <div key={group.titleKey} className="admin-nav-dropdown">
          <button
            type="button"
            className="admin-nav-trigger"
            // The button is the focus anchor for keyboard navigation —
            // tabbing into it opens the panel via :focus-within. No
            // onClick handler; CSS does the work.
            aria-haspopup="true"
          >
            {t(group.titleKey)}
          </button>
          <div className="admin-nav-panel" role="menu">
            {group.links.map(link => (
              <a
                key={link.href + link.labelKey}
                href={link.href}
                role="menuitem"
                {...(link.external
                  ? { target: '_blank', rel: 'noopener', title: t(link.labelKey) + ' (Spring Boot Admin)' }
                  : {})}
              >
                {t(link.labelKey)}
              </a>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
