/**
 * In-house i18n dictionary for the admin shell. (Phase 3.6)
 *
 * <h3>Why not next-intl / react-i18next</h3>
 * The full libraries assume a URL-routed locale (/en/admin, /de/admin)
 * and a middleware that rewrites every request. The admin shell is one
 * audience — operators — and we don't want the URL to change. A
 * cookie-driven, dictionary-lookup pattern fits better and stays under
 * 100 lines of runtime code.
 *
 * <h3>How to add a string</h3>
 * 1. Add a key to {@link MESSAGES.en} below
 * 2. Add the German translation to {@link MESSAGES.de}
 * 3. In a server component:  <h1>{translate(locale, 'page.system.title')}</h1>
 *    In a client component:  const t = useT(); return <h1>{t('page.system.title')}</h1>
 *
 * <h3>Missing keys</h3>
 * If a key is missing in the active locale, {@link translate} falls
 * back to the English string. If both are missing it returns the key
 * itself — that surfaces the gap visibly during development without
 * crashing prod.
 */

export type LocaleCode = 'en' | 'de';

export const LOCALE_LABEL: Record<LocaleCode, string> = {
  en: 'English',
  de: 'Deutsch',
};

export const DEFAULT_LOCALE: LocaleCode = 'en';

/**
 * Cookie name shared by the server resolver ({@link getLocale}) and
 * the client-side {@link LanguageSwitcher}. Lives in this pure-data
 * file (not in {@code getLocale.ts}) so client components can read it
 * without pulling in {@code next/headers} — that import would push the
 * bundle into "server-only" territory and Turbopack would refuse to
 * include it on the client.
 */
export const LOCALE_COOKIE_NAME = 'airwatch_locale';

/**
 * Pure-string dictionary. Keys are flat + dot-namespaced by surface so
 * grepping a UI string finds its translation rows quickly.
 */
export const MESSAGES: Record<LocaleCode, Record<string, string>> = {
  en: {
    // ─── Brand / chrome ───────────────────────────────────────────────
    'brand.name':                 'AIRWATCH ADMIN',

    // ─── Nav: top-level groups ────────────────────────────────────────
    'nav.group.live':             'Live',
    'nav.group.metrics':          'Metrics',
    'nav.group.tools':            'Tools',
    'nav.group.system':           'System',

    // ─── Nav: page links ──────────────────────────────────────────────
    'nav.dashboard':              'Dashboard',
    'nav.ports':                  'Ports',
    'nav.users':                  'Users',
    'nav.security':               'Security',
    'nav.audit':                  'Audit',
    'nav.errors':                 'Errors',
    'nav.cache':                  'Cache',
    'nav.jobs':                   'Jobs',
    'nav.settings':               'Settings',
    'nav.incidents':              'Incidents',
    'nav.probes':                 'Probes',
    'nav.health':                 'Health',
    'nav.quota':                  'Quota',
    'nav.features':               'Features',
    'nav.events':                 'Events',
    'nav.endpoints':              'Endpoints',
    'nav.system':                 'System',
    'nav.instances':              'Instances',
    'nav.jvm':                    'JVM',
    'nav.logout':                 'Logout',

    // ─── Common verbs ─────────────────────────────────────────────────
    'action.save':                'Save',
    'action.cancel':              'Cancel',
    'action.delete':              'Delete',
    'action.edit':                'Edit',
    'action.refresh':             'Refresh',
    'action.clear':               'Clear',
    'action.add':                 'Add',
    'action.create':              'Create',
    'action.close':               'Close',
    'action.open':                'Open',
    'action.pause':               'Pause',
    'action.resume':              'Resume',
    'action.apply':               'Apply',
    'action.reset':               'Reset',
    'action.run_now':             'Run now',
    'action.copy':                'Copy',
    'action.export_csv':          'Export CSV',
    'action.acknowledge':         'Acknowledge',
    'action.snooze':              'Snooze',
    'action.unsnooze':            'Cancel snooze',
    'action.mute':                'Mute',
    'action.unmute':              'Unmute',
    'action.revoke':              'Revoke',
    'action.kick':                'Kick',
    'action.kick_all_but_me':     'Kick all but me',
    'action.kick_stale':          'Kick stale (>24h)',

    // ─── Common states / labels ───────────────────────────────────────
    'state.loading':              'Loading…',
    'state.empty':                'No data',
    'state.error':                'Failed to load',
    'state.ok':                   'OK',
    'state.warning':              'Warning',
    'state.error_tone':           'Error',
    'state.healthy':              'Healthy',
    'state.unhealthy':            'Unhealthy',
    'state.degraded':             'Degraded',
    'state.never':                'never',
    'state.unknown':              'unknown',
    'state.idle':                 'IDLE',
    'state.running':              'RUNNING',
    'state.failed':               'FAILED',
    'state.success':              'OK',

    // ─── Status pills ─────────────────────────────────────────────────
    'status.up':                  'UP',
    'status.down':                'DOWN',
    'status.paused':              'Paused',
    'status.active':              'Active',
    'status.armed':               'Armed',
    'status.expired':             'Expired',
    'status.revoked':             'Revoked',
    'status.acknowledged':        'Acknowledged',
    'status.snoozed':             'Snoozed',
    'status.muted':               'Muted',

    // ─── Time ─────────────────────────────────────────────────────────
    'time.justnow':               'just now',
    'time.ago':                   ' ago',
    'time.never':                 'never',
    'time.unknown':               'unknown',
    'time.minute':                'minute',
    'time.minutes':               'minutes',
    'time.hour':                  'hour',
    'time.hours':                 'hours',
    'time.day':                   'day',
    'time.days':                  'days',
    'time.last_60min':            'last 60 minutes',
    'time.last_24h':              'last 24 hours',
    'time.last_30days':           'last 30 days',

    // ─── Auto-refresh widget ──────────────────────────────────────────
    'autorefresh.label':          'Auto-refresh',
    'autorefresh.off':            'Off',
    'autorefresh.refresh':        'Refresh',

    // ─── Maintenance banner ───────────────────────────────────────────
    'maintenance.banner':         'Maintenance mode active',

    // ─── Page: Dashboard ──────────────────────────────────────────────
    'page.dashboard.title':       'Operations Overview',
    'page.dashboard.subtitle':    'Live monitoring',
    'page.dashboard.last_refreshed': 'last refreshed',

    // ─── Page: Ports ──────────────────────────────────────────────────
    'page.ports.title':           'Ports',
    'page.ports.subtitle':        'Probe results for every port the API monitors. Refreshes every 30 s on the server.',
    'page.ports.kpi.uptime':      'UPTIME',
    'page.ports.kpi.uptime_hint': 'ports up',
    'page.ports.kpi.down':        'DOWN',
    'page.ports.kpi.down_hint_ok': 'all healthy',
    'page.ports.kpi.down_hint_some': 'investigate',
    'page.ports.kpi.avg_latency': 'AVG LATENCY',
    'page.ports.kpi.avg_latency_hint': 'across up ports',
    'page.ports.kpi.slowest':     'SLOWEST',
    'page.ports.section.latency': 'Port latency',
    'page.ports.section.all':     'All ports',
    'page.ports.col.status':      'Status',
    'page.ports.col.port':        'Port',
    'page.ports.col.endpoint':    'Endpoint',
    'page.ports.col.latency':     'Latency',
    'page.ports.col.last_probe':  'Last probe',
    'page.ports.col.last_error':  'Last error',
    'page.ports.empty':           'No probes yet — first round runs 30 s after startup.',

    // ─── Page: System ─────────────────────────────────────────────────
    'page.system.title':          'System',
    'page.system.subtitle':       'JVM snapshot from one of the api replicas (round-robin via docker DNS).',
    'page.system.kpi.heap_usage': 'HEAP USAGE',
    'page.system.kpi.max_heap':   'MAX HEAP',
    'page.system.kpi.threads':    'THREADS',
    'page.system.kpi.cores':      'CORES',
    'page.system.kpi.uptime':     'UPTIME',
    'page.system.kpi.heap_committed': 'committed',
    'page.system.kpi.heap_xmx':   '-Xmx',
    'page.system.kpi.threads_hint': 'active in JVM',
    'page.system.kpi.cores_hint': 'available to JVM',
    'page.system.section.heap':   'Heap usage',
    'page.system.section.notes':  'Notes',
    'page.system.note.replica':   'This snapshot is from one replica (Docker DNS round-robin). Refresh to sample another.',
    'page.system.note.histograms': 'Per-replica histograms live in Prometheus / Grafana — see the Loadtest dashboard.',
    'page.system.note.threads':   'Thread count includes Tomcat workers, the WS push pool, ShedLock workers, and Hikari maintenance threads.',

    // ─── Page: Security ───────────────────────────────────────────────
    'page.security.title':        'Security',
    'page.security.subtitle':     'Auth events, blocked IPs, audit trail. Server-side gates: AdminAuthFilter + LoginThrottleService.',
    'page.security.kpi.blocked_attempts': 'BLOCKED ATTEMPTS',
    'page.security.kpi.unique_ips_hint': 'unique IPs',
    'page.security.kpi.login_failures': 'LOGIN FAILURES',
    'page.security.kpi.successful_logins_hint': 'successful logins',
    'page.security.kpi.audit_24h': 'AUDIT EVENTS · 24H',
    'page.security.kpi.audit_24h_hint': 'all admin actions',
    'page.security.kpi.audit_total': 'AUDIT TOTAL',
    'page.security.kpi.audit_total_hint': 'lifetime entries',
    'page.security.section.top_offenders': 'Top offenders by attempt count',
    'page.security.section.live_feed':     'Live rejection feed',
    'page.security.empty.no_blocked':      'No blocked IPs recorded yet.',
    'page.security.empty.all_quiet':       'ALL QUIET',
    'page.security.empty.all_quiet_hint':  'No rejected requests in the recent window.',

    // ─── Page: Health ─────────────────────────────────────────────────
    'page.health.title':          'Health',
    'page.health.subtitle':       'Per-component health snapshot — DB connection, Airlabs poller, WebSocket handler, endpoint metrics.',

    // ─── Page: Quota ──────────────────────────────────────────────────
    'page.quota.title':           'Airlabs quota',
    'page.quota.subtitle':        'Monthly cap, current usage, and hourly burn rate. Throttle the poller if burn-% sustained >100%.',
    'page.quota.kpi.monthly_usage': 'MONTHLY USAGE',
    'page.quota.kpi.remaining':   'REMAINING',
    'page.quota.kpi.remaining_hint': 'calls until quota reset',
    'page.quota.kpi.hourly_burn': 'HOURLY BURN',
    'page.quota.kpi.hourly_burn_hint': 'vs even-pace average',
    'page.quota.kpi.last_hour':   'LAST HOUR',
    'page.quota.kpi.last_hour_hint': 'api calls',
    'page.quota.kpi.last_24h':    'LAST 24H',
    'page.quota.kpi.last_24h_hint': 'api calls',
    'page.quota.section.monthly': 'Monthly progress',
    'page.quota.section.hourly':  'Hourly burn rate',
    'page.quota.section.forecast':'Forecast',
    'page.quota.section.cost':    'Cost',
    'page.quota.forecast.days_left': 'days of quota left at the current 24h burn rate',
    'page.quota.cost.last_hour':  'LAST HOUR',
    'page.quota.cost.today':      'TODAY',
    'page.quota.cost.this_month': 'THIS MONTH',
    'page.quota.cost.projected':  'PROJECTED 30d',

    // ─── Page: Errors ─────────────────────────────────────────────────
    'page.errors.title':          'Errors',
    'page.errors.subtitle':       'Live tail of the in-memory error buffer (capacity 500).',
    'page.errors.kpi.total':      'TOTAL SEEN',
    'page.errors.kpi.total_hint': 'lifetime errors',
    'page.errors.kpi.buffered':   'BUFFERED',
    'page.errors.kpi.buffered_hint': 'in-memory window',
    'page.errors.kpi.unique':     'UNIQUE SIGNATURES',
    'page.errors.kpi.unique_hint':'distinct errors',
    'page.errors.section.backend':'Backend errors',
    'page.errors.section.frontend':'Frontend errors',
    'page.errors.empty':          'Buffer empty',
    'page.errors.empty_hint':     'No errors logged in the last window. The buffer auto-fills the moment something logs at WARN/ERROR.',
    'page.errors.action.clear':   'Clear buffer',

    // ─── Page: Cache ──────────────────────────────────────────────────
    'page.cache.title':           'Cache',
    'page.cache.subtitle':        'Caffeine cache statistics. Clearing invalidates all entries; next call rebuilds.',
    'page.cache.kpi.caches':      'CACHES',
    'page.cache.kpi.caches_hint': 'registered',
    'page.cache.kpi.entries':     'TOTAL ENTRIES',
    'page.cache.kpi.entries_hint':'across all caches',
    'page.cache.kpi.hit_rate':    'OVERALL HIT-RATE',
    'page.cache.kpi.evictions':   'EVICTIONS',
    'page.cache.kpi.evictions_hint': 'lifetime',
    'page.cache.section.per_cache': 'Per-cache stats',
    'page.cache.action.clear':    'Clear all caches',

    // ─── Page: Jobs ───────────────────────────────────────────────────
    'page.jobs.title':            'Scheduled jobs',
    'page.jobs.subtitle':         '@Scheduled tasks. ShedLock prevents the same job firing on multiple replicas.',
    'page.jobs.kpi.jobs':         'JOBS',
    'page.jobs.kpi.jobs_hint':    'registered',
    'page.jobs.kpi.running':      'RUNNING',
    'page.jobs.kpi.failing':      'FAILING',
    'page.jobs.kpi.failing_hint_ok': 'all healthy',
    'page.jobs.kpi.failing_hint_bad': 'investigate',
    'page.jobs.kpi.lifetime':     'LIFETIME RUNS',
    'page.jobs.section.all':      'All jobs',
    'page.jobs.empty':            'No scheduled jobs',
    'page.jobs.col.interval':     'Interval',
    'page.jobs.col.last_start':   'Last start',
    'page.jobs.col.last_finish':  'Last finish',
    'page.jobs.col.last_took':    'Last took',
    'page.jobs.col.runs':         'Runs',
    'page.jobs.col.errors':       'Errors',

    // ─── Page: Users ──────────────────────────────────────────────────
    'page.users.title':           'Users & sessions',
    'page.users.subtitle':        'Active connections across both api replicas, plus authenticated admin sessions.',
    'page.users.kpi.http':        'HTTP SESSIONS',
    'page.users.kpi.ws':          'WS SESSIONS',
    'page.users.kpi.admin':       'ADMIN SESSIONS',
    'page.users.kpi.admin_hint':  'authenticated operators',
    'page.users.kpi.peak':        'peak',
    'page.users.section.chart':   'Sessions',
    'page.users.section.admin':   'Authenticated admin sessions',
    'page.users.empty':           'No admin sessions',

    // ─── Page: Settings ───────────────────────────────────────────────
    'page.settings.title':        'Settings',
    'page.settings.subtitle':     'Account credentials + two-factor authentication for user',
    'page.settings.section.theme':       'Theme',
    'page.settings.section.maintenance': 'Maintenance mode',
    'page.settings.section.schedules':   'Scheduled maintenance windows',
    'page.settings.section.api_keys':    'API Keys',
    'page.settings.section.webhook':     'Webhook',
    'page.settings.section.password':    'Change password',
    'page.settings.section.2fa':         'Two-factor authentication',

    // ─── Page: Features ───────────────────────────────────────────────
    'page.features.title':        'Features',
    'page.features.subtitle':     'Event-counter totals per feature category since process start.',
    'page.features.kpi.categories':'CATEGORIES',
    'page.features.kpi.categories_hint':'distinct features tracked',
    'page.features.kpi.total':    'TOTAL EVENTS',
    'page.features.kpi.total_hint':'all categories combined',
    'page.features.kpi.most_used':'MOST USED',
    'page.features.kpi.unused':   'UNUSED',
    'page.features.kpi.unused_hint':'features at zero',
    'page.features.section.flags':'Feature flags',
    'page.features.section.usage':'Usage by category',

    // ─── Page: Incidents ──────────────────────────────────────────────
    'page.incidents.title':       'Incidents',
    'page.incidents.subtitle':    'Operator-managed incident lifecycle. Open one when a real production event needs a postmortem.',
    'page.incidents.kpi.open':    'OPEN NOW',
    'page.incidents.kpi.open_hint_ok': 'all clear',
    'page.incidents.kpi.open_hint_bad': 'investigate',
    'page.incidents.kpi.opened_7d':'OPENED IN 7 DAYS',
    'page.incidents.kpi.opened_7d_hint':'trailing week',
    'page.incidents.kpi.avg_30d': 'AVG DURATION 30D',
    'page.incidents.kpi.avg_30d_hint':'closed only',
    'page.incidents.section.open':'Open new incident',
    'page.incidents.section.all': 'All incidents',
    'page.incidents.empty':       'No incidents yet.',

    // ─── Page: Probes ─────────────────────────────────────────────────
    'page.probes.title':          'Synthetic probes',
    'page.probes.subtitle':       'Operator-defined HTTP checks. Threshold breaches fire through the standard alert pipeline.',
    'page.probes.kpi.registered': 'REGISTERED',
    'page.probes.kpi.registered_hint':'all probes',
    'page.probes.kpi.enabled':    'ENABLED',
    'page.probes.kpi.enabled_hint':'actively polled',
    'page.probes.kpi.failing':    'FAILING',
    'page.probes.kpi.failing_hint_ok':'all green',
    'page.probes.kpi.failing_hint_bad':'investigate',
    'page.probes.section.add':    'Add probe',
    'page.probes.section.all':    'All probes',

    // ─── HelpPanel ────────────────────────────────────────────────────
    'help.panel.title':           'Runbook',

    // ─── Toasts (action result keys) ──────────────────────────────────
    'toast.cleared':              'Cleared.',
    'toast.kicked_all_but_me':    'All other admin sessions kicked. Yours is unaffected.',
    'toast.kicked_stale':         'Stale sessions cleared.',
    'toast.opened':               'Opened.',
    'toast.closed':               'Closed.',
    'toast.updated':              'Saved.',
  },

  de: {
    // ─── Brand / chrome ───────────────────────────────────────────────
    'brand.name':                 'AIRWATCH ADMIN',

    // ─── Nav: top-level groups ────────────────────────────────────────
    'nav.group.live':             'Live',
    'nav.group.metrics':          'Metriken',
    'nav.group.tools':            'Werkzeuge',
    'nav.group.system':           'System',

    // ─── Nav: page links ──────────────────────────────────────────────
    'nav.dashboard':              'Übersicht',
    'nav.ports':                  'Ports',
    'nav.users':                  'Benutzer',
    'nav.security':               'Sicherheit',
    'nav.audit':                  'Prüfprotokoll',
    'nav.errors':                 'Fehler',
    'nav.cache':                  'Cache',
    'nav.jobs':                   'Jobs',
    'nav.settings':               'Einstellungen',
    'nav.incidents':              'Vorfälle',
    'nav.probes':                 'Probes',
    'nav.health':                 'Gesundheit',
    'nav.quota':                  'Kontingent',
    'nav.features':               'Features',
    'nav.events':                 'Ereignisse',
    'nav.endpoints':              'Endpunkte',
    'nav.system':                 'System',
    'nav.instances':              'Instanzen',
    'nav.jvm':                    'JVM',
    'nav.logout':                 'Abmelden',

    // ─── Common verbs ─────────────────────────────────────────────────
    'action.save':                'Speichern',
    'action.cancel':              'Abbrechen',
    'action.delete':              'Löschen',
    'action.edit':                'Bearbeiten',
    'action.refresh':             'Aktualisieren',
    'action.clear':               'Leeren',
    'action.add':                 'Hinzufügen',
    'action.create':              'Anlegen',
    'action.close':               'Schließen',
    'action.open':                'Öffnen',
    'action.pause':               'Pausieren',
    'action.resume':              'Fortsetzen',
    'action.apply':               'Anwenden',
    'action.reset':               'Zurücksetzen',
    'action.run_now':             'Jetzt ausführen',
    'action.copy':                'Kopieren',
    'action.export_csv':          'CSV-Export',
    'action.acknowledge':         'Bestätigen',
    'action.snooze':              'Schlummern',
    'action.unsnooze':            'Schlummern aufheben',
    'action.mute':                'Stummschalten',
    'action.unmute':              'Stumm aufheben',
    'action.revoke':              'Widerrufen',
    'action.kick':                'Trennen',
    'action.kick_all_but_me':     'Alle außer mir trennen',
    'action.kick_stale':          'Inaktive trennen (>24h)',

    // ─── Common states / labels ───────────────────────────────────────
    'state.loading':              'Wird geladen…',
    'state.empty':                'Keine Daten',
    'state.error':                'Laden fehlgeschlagen',
    'state.ok':                   'OK',
    'state.warning':              'Warnung',
    'state.error_tone':           'Fehler',
    'state.healthy':              'Gesund',
    'state.unhealthy':            'Krank',
    'state.degraded':             'Eingeschränkt',
    'state.never':                'nie',
    'state.unknown':              'unbekannt',
    'state.idle':                 'INAKTIV',
    'state.running':              'LÄUFT',
    'state.failed':               'FEHLER',
    'state.success':              'OK',

    // ─── Status pills ─────────────────────────────────────────────────
    'status.up':                  'AKTIV',
    'status.down':                'AUSFALL',
    'status.paused':              'Pausiert',
    'status.active':              'Aktiv',
    'status.armed':               'Scharfgeschaltet',
    'status.expired':             'Abgelaufen',
    'status.revoked':             'Widerrufen',
    'status.acknowledged':        'Bestätigt',
    'status.snoozed':             'Schlummernd',
    'status.muted':               'Stumm',

    // ─── Time ─────────────────────────────────────────────────────────
    'time.justnow':               'gerade eben',
    'time.ago':                   ' her',
    'time.never':                 'nie',
    'time.unknown':               'unbekannt',
    'time.minute':                'Minute',
    'time.minutes':               'Minuten',
    'time.hour':                  'Stunde',
    'time.hours':                 'Stunden',
    'time.day':                   'Tag',
    'time.days':                  'Tage',
    'time.last_60min':            'letzte 60 Minuten',
    'time.last_24h':              'letzte 24 Stunden',
    'time.last_30days':           'letzte 30 Tage',

    // ─── Auto-refresh widget ──────────────────────────────────────────
    'autorefresh.label':          'Auto-Aktualisierung',
    'autorefresh.off':            'Aus',
    'autorefresh.refresh':        'Aktualisieren',

    // ─── Maintenance banner ───────────────────────────────────────────
    'maintenance.banner':         'Wartungsmodus aktiv',

    // ─── Page: Dashboard ──────────────────────────────────────────────
    'page.dashboard.title':       'Betriebsübersicht',
    'page.dashboard.subtitle':    'Live-Überwachung',
    'page.dashboard.last_refreshed': 'zuletzt aktualisiert',

    // ─── Page: Ports ──────────────────────────────────────────────────
    'page.ports.title':           'Ports',
    'page.ports.subtitle':        'Probe-Ergebnisse für jeden überwachten Port. Aktualisiert sich serverseitig alle 30 s.',
    'page.ports.kpi.uptime':      'VERFÜGBARKEIT',
    'page.ports.kpi.uptime_hint': 'Ports aktiv',
    'page.ports.kpi.down':        'AUSFÄLLE',
    'page.ports.kpi.down_hint_ok': 'alles gesund',
    'page.ports.kpi.down_hint_some': 'untersuchen',
    'page.ports.kpi.avg_latency': 'Ø LATENZ',
    'page.ports.kpi.avg_latency_hint': 'aktive Ports',
    'page.ports.kpi.slowest':     'LANGSAMSTER',
    'page.ports.section.latency': 'Port-Latenz',
    'page.ports.section.all':     'Alle Ports',
    'page.ports.col.status':      'Status',
    'page.ports.col.port':        'Port',
    'page.ports.col.endpoint':    'Endpunkt',
    'page.ports.col.latency':     'Latenz',
    'page.ports.col.last_probe':  'Letzte Probe',
    'page.ports.col.last_error':  'Letzter Fehler',
    'page.ports.empty':           'Noch keine Probes — erste Runde 30 s nach Start.',

    // ─── Page: System ─────────────────────────────────────────────────
    'page.system.title':          'System',
    'page.system.subtitle':       'JVM-Schnappschuss von einer der API-Replicas (Round-Robin via Docker DNS).',
    'page.system.kpi.heap_usage': 'HEAP-AUSLASTUNG',
    'page.system.kpi.max_heap':   'MAX HEAP',
    'page.system.kpi.threads':    'THREADS',
    'page.system.kpi.cores':      'KERNE',
    'page.system.kpi.uptime':     'LAUFZEIT',
    'page.system.kpi.heap_committed': 'committed',
    'page.system.kpi.heap_xmx':   '-Xmx',
    'page.system.kpi.threads_hint': 'aktiv in JVM',
    'page.system.kpi.cores_hint': 'verfügbar für JVM',
    'page.system.section.heap':   'Heap-Auslastung',
    'page.system.section.notes':  'Hinweise',
    'page.system.note.replica':   'Snapshot stammt von einer Replica (Docker-DNS-Round-Robin). Aktualisieren liefert eine andere Stichprobe.',
    'page.system.note.histograms':'Replica-Histogramme leben in Prometheus / Grafana — siehe Loadtest-Dashboard.',
    'page.system.note.threads':   'Thread-Zahl umfasst Tomcat-Worker, WS-Push-Pool, ShedLock-Worker und Hikari-Wartungsthreads.',

    // ─── Page: Security ───────────────────────────────────────────────
    'page.security.title':        'Sicherheit',
    'page.security.subtitle':     'Auth-Ereignisse, blockierte IPs, Prüfpfad. Server-Gates: AdminAuthFilter + LoginThrottleService.',
    'page.security.kpi.blocked_attempts': 'BLOCKIERTE VERSUCHE',
    'page.security.kpi.unique_ips_hint': 'eindeutige IPs',
    'page.security.kpi.login_failures': 'FEHLGESCHLAGENE LOGINS',
    'page.security.kpi.successful_logins_hint': 'erfolgreiche Logins',
    'page.security.kpi.audit_24h': 'PRÜFEREIGNISSE · 24H',
    'page.security.kpi.audit_24h_hint': 'alle Admin-Aktionen',
    'page.security.kpi.audit_total': 'PRÜFEINTRÄGE GESAMT',
    'page.security.kpi.audit_total_hint': 'lebenslange Einträge',
    'page.security.section.top_offenders': 'Top-Angreifer nach Versuchszahl',
    'page.security.section.live_feed':     'Live-Ablehnungsfeed',
    'page.security.empty.no_blocked':      'Noch keine blockierten IPs erfasst.',
    'page.security.empty.all_quiet':       'ALLES RUHIG',
    'page.security.empty.all_quiet_hint':  'Keine abgelehnten Anfragen im aktuellen Fenster.',

    // ─── Page: Health ─────────────────────────────────────────────────
    'page.health.title':          'Gesundheit',
    'page.health.subtitle':       'Komponenten-Gesundheits-Snapshot — DB-Verbindung, Airlabs-Poller, WebSocket-Handler, Endpunkt-Metriken.',

    // ─── Page: Quota ──────────────────────────────────────────────────
    'page.quota.title':           'Airlabs-Kontingent',
    'page.quota.subtitle':        'Monatslimit, aktueller Verbrauch, Stunden-Burnrate. Poller drosseln wenn Burn-% nachhaltig >100%.',
    'page.quota.kpi.monthly_usage': 'MONATSVERBRAUCH',
    'page.quota.kpi.remaining':   'VERBLEIBEND',
    'page.quota.kpi.remaining_hint': 'Aufrufe bis Reset',
    'page.quota.kpi.hourly_burn': 'STUNDEN-BURN',
    'page.quota.kpi.hourly_burn_hint': 'vs. gleichmäßiger Schnitt',
    'page.quota.kpi.last_hour':   'LETZTE STUNDE',
    'page.quota.kpi.last_hour_hint': 'API-Aufrufe',
    'page.quota.kpi.last_24h':    'LETZTE 24H',
    'page.quota.kpi.last_24h_hint': 'API-Aufrufe',
    'page.quota.section.monthly': 'Monatsfortschritt',
    'page.quota.section.hourly':  'Stunden-Burnrate',
    'page.quota.section.forecast':'Prognose',
    'page.quota.section.cost':    'Kosten',
    'page.quota.forecast.days_left': 'Tage Kontingent verbleibend bei aktueller 24h-Burnrate',
    'page.quota.cost.last_hour':  'LETZTE STUNDE',
    'page.quota.cost.today':      'HEUTE',
    'page.quota.cost.this_month': 'DIESER MONAT',
    'page.quota.cost.projected':  'PROGNOSE 30T',

    // ─── Page: Errors ─────────────────────────────────────────────────
    'page.errors.title':          'Fehler',
    'page.errors.subtitle':       'Live-Tail des In-Memory-Fehlerpuffers (Kapazität 500).',
    'page.errors.kpi.total':      'GESAMT GESEHEN',
    'page.errors.kpi.total_hint': 'lebenslange Fehler',
    'page.errors.kpi.buffered':   'GEPUFFERT',
    'page.errors.kpi.buffered_hint': 'In-Memory-Fenster',
    'page.errors.kpi.unique':     'EINDEUTIGE SIGNATUREN',
    'page.errors.kpi.unique_hint':'verschiedene Fehler',
    'page.errors.section.backend':'Backend-Fehler',
    'page.errors.section.frontend':'Frontend-Fehler',
    'page.errors.empty':          'Puffer leer',
    'page.errors.empty_hint':     'Keine Fehler im aktuellen Fenster. Der Puffer füllt sich automatisch sobald etwas auf WARN/ERROR loggt.',
    'page.errors.action.clear':   'Puffer leeren',

    // ─── Page: Cache ──────────────────────────────────────────────────
    'page.cache.title':           'Cache',
    'page.cache.subtitle':        'Caffeine-Cache-Statistiken. Leeren invalidiert alle Einträge; nächster Aufruf baut neu auf.',
    'page.cache.kpi.caches':      'CACHES',
    'page.cache.kpi.caches_hint': 'registriert',
    'page.cache.kpi.entries':     'EINTRÄGE GESAMT',
    'page.cache.kpi.entries_hint':'über alle Caches',
    'page.cache.kpi.hit_rate':    'GESAMT-TREFFERQUOTE',
    'page.cache.kpi.evictions':   'AUSWÜRFE',
    'page.cache.kpi.evictions_hint': 'lebenslang',
    'page.cache.section.per_cache': 'Pro-Cache-Statistiken',
    'page.cache.action.clear':    'Alle Caches leeren',

    // ─── Page: Jobs ───────────────────────────────────────────────────
    'page.jobs.title':            'Geplante Jobs',
    'page.jobs.subtitle':         '@Scheduled-Tasks. ShedLock verhindert Mehrfach-Ausführung über Replicas.',
    'page.jobs.kpi.jobs':         'JOBS',
    'page.jobs.kpi.jobs_hint':    'registriert',
    'page.jobs.kpi.running':      'LÄUFT',
    'page.jobs.kpi.failing':      'FEHLERHAFT',
    'page.jobs.kpi.failing_hint_ok': 'alles gesund',
    'page.jobs.kpi.failing_hint_bad': 'untersuchen',
    'page.jobs.kpi.lifetime':     'LEBENSLANGE LÄUFE',
    'page.jobs.section.all':      'Alle Jobs',
    'page.jobs.empty':            'Keine geplanten Jobs',
    'page.jobs.col.interval':     'Intervall',
    'page.jobs.col.last_start':   'Letzter Start',
    'page.jobs.col.last_finish':  'Letztes Ende',
    'page.jobs.col.last_took':    'Dauer letzter',
    'page.jobs.col.runs':         'Läufe',
    'page.jobs.col.errors':       'Fehler',

    // ─── Page: Users ──────────────────────────────────────────────────
    'page.users.title':           'Benutzer & Sitzungen',
    'page.users.subtitle':        'Aktive Verbindungen über beide API-Replicas, plus authentifizierte Admin-Sitzungen.',
    'page.users.kpi.http':        'HTTP-SITZUNGEN',
    'page.users.kpi.ws':          'WS-SITZUNGEN',
    'page.users.kpi.admin':       'ADMIN-SITZUNGEN',
    'page.users.kpi.admin_hint':  'authentifizierte Operatoren',
    'page.users.kpi.peak':        'Spitze',
    'page.users.section.chart':   'Sitzungen',
    'page.users.section.admin':   'Authentifizierte Admin-Sitzungen',
    'page.users.empty':           'Keine Admin-Sitzungen',

    // ─── Page: Settings ───────────────────────────────────────────────
    'page.settings.title':        'Einstellungen',
    'page.settings.subtitle':     'Account-Zugangsdaten + Zwei-Faktor-Authentifizierung für Benutzer',
    'page.settings.section.theme':       'Design',
    'page.settings.section.maintenance': 'Wartungsmodus',
    'page.settings.section.schedules':   'Geplante Wartungsfenster',
    'page.settings.section.api_keys':    'API-Schlüssel',
    'page.settings.section.webhook':     'Webhook',
    'page.settings.section.password':    'Passwort ändern',
    'page.settings.section.2fa':         'Zwei-Faktor-Authentifizierung',

    // ─── Page: Features ───────────────────────────────────────────────
    'page.features.title':        'Features',
    'page.features.subtitle':     'Ereigniszähler-Summen pro Feature-Kategorie seit Prozessstart.',
    'page.features.kpi.categories':'KATEGORIEN',
    'page.features.kpi.categories_hint':'erfasste Features',
    'page.features.kpi.total':    'EREIGNISSE GESAMT',
    'page.features.kpi.total_hint':'alle Kategorien zusammen',
    'page.features.kpi.most_used':'AM HÄUFIGSTEN',
    'page.features.kpi.unused':   'UNGENUTZT',
    'page.features.kpi.unused_hint':'Features bei Null',
    'page.features.section.flags':'Feature-Flags',
    'page.features.section.usage':'Nutzung pro Kategorie',

    // ─── Page: Incidents ──────────────────────────────────────────────
    'page.incidents.title':       'Vorfälle',
    'page.incidents.subtitle':    'Operator-gemanagter Vorfall-Lebenszyklus. Eröffnen wenn ein echter Produktions-Vorfall ein Postmortem braucht.',
    'page.incidents.kpi.open':    'AKTUELL OFFEN',
    'page.incidents.kpi.open_hint_ok': 'alles ruhig',
    'page.incidents.kpi.open_hint_bad': 'untersuchen',
    'page.incidents.kpi.opened_7d':'ERÖFFNET IN 7 TAGEN',
    'page.incidents.kpi.opened_7d_hint':'letzte Woche',
    'page.incidents.kpi.avg_30d': 'Ø DAUER 30T',
    'page.incidents.kpi.avg_30d_hint':'nur geschlossene',
    'page.incidents.section.open':'Neuen Vorfall eröffnen',
    'page.incidents.section.all': 'Alle Vorfälle',
    'page.incidents.empty':       'Noch keine Vorfälle.',

    // ─── Page: Probes ─────────────────────────────────────────────────
    'page.probes.title':          'Synthetische Probes',
    'page.probes.subtitle':       'Operator-definierte HTTP-Checks. Schwellwert-Überschreitungen feuern über die Standard-Alert-Pipeline.',
    'page.probes.kpi.registered': 'REGISTRIERT',
    'page.probes.kpi.registered_hint':'alle Probes',
    'page.probes.kpi.enabled':    'AKTIVIERT',
    'page.probes.kpi.enabled_hint':'aktiv abgefragt',
    'page.probes.kpi.failing':    'FEHLERHAFT',
    'page.probes.kpi.failing_hint_ok':'alles grün',
    'page.probes.kpi.failing_hint_bad':'untersuchen',
    'page.probes.section.add':    'Probe hinzufügen',
    'page.probes.section.all':    'Alle Probes',

    // ─── HelpPanel ────────────────────────────────────────────────────
    'help.panel.title':           'Anleitung',

    // ─── Toasts (action result keys) ──────────────────────────────────
    'toast.cleared':              'Geleert.',
    'toast.kicked_all_but_me':    'Alle anderen Admin-Sitzungen getrennt. Ihre bleibt erhalten.',
    'toast.kicked_stale':         'Inaktive Sitzungen entfernt.',
    'toast.opened':               'Eröffnet.',
    'toast.closed':               'Geschlossen.',
    'toast.updated':              'Gespeichert.',
  },
};

export type MessageKey = keyof typeof MESSAGES['en'];

/**
 * Direct lookup — used by both the {@link useT} client hook AND server
 * components that resolve the locale from cookies at render time.
 *
 * <p>Falls back through: requested locale → English → key itself. The
 * last fallback is a debugging aid: if you see "page.system.title"
 * rendered literally, you have a missing-key issue — fix the dictionary
 * rather than the call site.
 */
export function translate(locale: LocaleCode, key: string): string {
  const dict = MESSAGES[locale];
  if (dict && key in dict) return dict[key];
  if (locale !== 'en' && key in MESSAGES.en) return MESSAGES.en[key];
  return key;
}
