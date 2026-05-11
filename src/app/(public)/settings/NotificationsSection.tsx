'use client';

import { Bell, BellOff } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { SectionPanel } from '@/app/(public)/settings/SectionPanel';
import { usePushSubscription } from '@/lib/push/usePushSubscription';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useEffect, useState } from 'react';
import type { AppLanguage } from '@/lib/types';

/**
 * Web Push opt-in. Hidden entirely when the browser doesn't support
 * PushManager OR when the api wasn't built with a VAPID public key —
 * "an inert toggle the user can't act on" is worse than no toggle.
 *
 * The clientId is the same one favoritesStore + the WS handshake use,
 * so the api can match a push subscription to the same user the
 * geofence alerts already key on.
 */
export function NotificationsSection({ language }: { language: AppLanguage }) {
  // Stable per-browser client id. Read from localStorage on mount so
  // SSR hydration doesn't mismatch.
  const [clientId, setClientId] = useState<string | null>(null);
  // Read indirectly — favoritesStore doesn't know the client id; we
  // derive a stable id ourselves under the same key the WS uses.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const KEY = 'airwatch.client-id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, '');
      try { localStorage.setItem(KEY, id); } catch { /* private mode — id is per-tab */ }
    }
    setClientId(id);
  }, []);

  // Touch favoritesStore so a starred-flight count surfaces in the hint
  // — that's the population the user actually wants notifications for.
  const favoritesCount = useFavoritesStore((s) => s.items.length);

  const { status, busy, error, subscribed, subscribe, unsubscribe } = usePushSubscription(clientId);

  // Hide entirely when the platform / build can't deliver pushes.
  if (status === 'unsupported' || status === 'unconfigured') return null;

  const denied = status === 'denied';
  const Icon = subscribed ? Bell : BellOff;
  const labelKey = subscribed ? 'notifications_off' : 'notifications_on';

  return (
    <SectionPanel icon={<Bell size={12} />} title={t('notifications', language)}>
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon size={16} className={subscribed ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'} />
          <div className="min-w-0">
            <div className="text-sm font-[var(--font-body)] text-[var(--text-primary)]">
              {t(subscribed ? 'notifications_status_on' : 'notifications_status_off', language)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              {denied
                ? t('notifications_denied_hint', language)
                : t('notifications_hint', language).replace('{0}', String(favoritesCount))}
            </div>
            {error && <div className="text-[11px] text-[var(--error)] mt-0.5">{error}</div>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => (subscribed ? unsubscribe() : subscribe())}
          disabled={busy || denied || !clientId}
          aria-label={t(labelKey, language)}
          className="px-3 py-1.5 rounded-md text-xs font-[var(--font-heading)] tracking-wide
                     border border-[var(--border)] text-[var(--text-secondary)]
                     hover:text-[var(--primary)] hover:border-[var(--primary)]
                     disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? '…' : t(labelKey, language)}
        </button>
      </div>
    </SectionPanel>
  );
}
