'use client';

import { Bell, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n/translations';
import { Switch } from '@/components/ui/Switch';
import { SectionPanel } from '@/app/(public)/settings/SectionPanel';
import { usePushSubscription } from '@/lib/push/usePushSubscription';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import type { AppLanguage } from '@/lib/types';

/**
 * Web Push opt-in. Hidden entirely when the browser doesn't support
 * PushManager OR when the api wasn't built with a VAPID public key —
 * "an inert toggle the user can't act on" is worse than no toggle.
 */
export function NotificationsSection({ language }: { language: AppLanguage }) {
  const [clientId, setClientId] = useState<string | null>(null);
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

  const favoritesCount = useFavoritesStore((s) => s.items.length);
  const { status, busy, error, subscribed, subscribe, unsubscribe } = usePushSubscription(clientId);

  if (status === 'unsupported' || status === 'unconfigured') return null;

  const denied = status === 'denied';
  const StatusIcon = subscribed ? Bell : BellOff;

  const handleToggle = () => {
    if (denied || busy || !clientId) return;
    if (subscribed) unsubscribe(); else subscribe();
  };

  return (
    <SectionPanel icon={<Bell size={12} />} title={t('notifications', language)}>
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIcon
            size={16}
            className={subscribed ? 'text-[var(--success)] shrink-0' : 'text-[var(--text-muted)] shrink-0'}
          />
          <div className="min-w-0">
            <div className="text-sm font-[var(--font-body)] text-[var(--text-primary)]">
              {t(subscribed ? 'notifications_status_on' : 'notifications_status_off', language)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] leading-snug">
              {denied
                ? t('notifications_denied_hint', language)
                : t('notifications_hint', language).replace('{0}', String(favoritesCount))}
            </div>
            {error && <div className="text-[11px] text-[var(--error)] mt-0.5">{error}</div>}
          </div>
        </div>
        <Switch
          checked={subscribed}
          onChange={handleToggle}
          disabled={busy || denied || !clientId}
          size="md"
          aria-label={t(subscribed ? 'notifications_off' : 'notifications_on', language)}
        />
      </div>
    </SectionPanel>
  );
}
