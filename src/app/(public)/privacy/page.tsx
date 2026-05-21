'use client';

/**
 * Privacy + storage disclosure.
 *
 * <h3>Why this exists</h3>
 * The app stores user-identifying data client-side (favourites, stats,
 * a stable client id used by GeoFenceService + Push) and the api hashes
 * incoming IPs for analytics. EU users have a right to know what's
 * persisted, where, and for how long. This page documents it in plain
 * language so we don't need a separate cookie-consent banner — we
 * don't actually set tracking cookies, so the disclosure is the
 * compliance boundary.
 *
 * <h3>Maintenance contract</h3>
 * Every time you add a new persisted store / a new beacon / a new
 * outbound integration, you MUST add a row to the matching table here.
 * This page is the single source of truth for "what does AirWatch keep
 * about me" and reviewers grep for it before legal sign-off.
 */
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { PageContainer, FadeIn } from '@/components/ui';
import { Card } from '@/components/ui/Card';

export default function PrivacyPage() {
  const language = useSettingsStore((s) => s.language);

  return (
    <PageContainer maxWidth="2xl" title={t('privacy_title', language)}>
      <FadeIn>
        <Card bare bodyClassName="p-5 space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {t('privacy_intro', language)}
          </p>
        </Card>
      </FadeIn>

      <FadeIn delay={60}>
        <Card
          title={t('privacy_local_storage_title', language)}
          className="mt-4"
        >
          <p className="text-xs text-[var(--text-muted)]">
            {t('privacy_local_storage_intro', language)}
          </p>
          <table className="w-full text-xs mt-3">
            <thead className="text-[var(--text-muted)]">
              <tr className="text-left">
                <th className="py-1.5 pr-3">{t('privacy_col_key', language)}</th>
                <th className="py-1.5 pr-3">{t('privacy_col_purpose', language)}</th>
                <th className="py-1.5">{t('privacy_col_lifetime', language)}</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[var(--text-secondary)]">
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-3">airwatch.client-id</td>
                <td className="py-1.5 pr-3">{t('privacy_clientid_purpose', language)}</td>
                <td className="py-1.5">{t('privacy_lifetime_until_clear', language)}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-3">airwatch-favorites</td>
                <td className="py-1.5 pr-3">{t('privacy_favorites_purpose', language)}</td>
                <td className="py-1.5">{t('privacy_lifetime_until_clear', language)}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-3">airwatch-stats</td>
                <td className="py-1.5 pr-3">{t('privacy_stats_purpose', language)}</td>
                <td className="py-1.5">{t('privacy_lifetime_until_clear', language)}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-3">airwatch-settings</td>
                <td className="py-1.5 pr-3">{t('privacy_settings_purpose', language)}</td>
                <td className="py-1.5">{t('privacy_lifetime_until_clear', language)}</td>
              </tr>
              <tr className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-3">airwatch-geofences</td>
                <td className="py-1.5 pr-3">{t('privacy_geofences_purpose', language)}</td>
                <td className="py-1.5">{t('privacy_lifetime_until_clear', language)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-[var(--text-muted)] mt-3">
            {t('privacy_local_storage_clear_hint', language)}
          </p>
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        <Card title={t('privacy_server_title', language)} className="mt-4">
          <ul className="text-xs text-[var(--text-secondary)] space-y-2 list-disc list-inside">
            <li>{t('privacy_server_ip_hash', language)}</li>
            <li>{t('privacy_server_geoip', language)}</li>
            <li>{t('privacy_server_view_beacons', language)}</li>
            <li>{t('privacy_server_no_account', language)}</li>
          </ul>
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
        <Card title={t('privacy_third_party_title', language)} className="mt-4">
          <p className="text-xs text-[var(--text-muted)]">
            {t('privacy_third_party_intro', language)}
          </p>
          <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside mt-3">
            <li>airlabs.co — {t('privacy_third_airlabs', language)}</li>
            <li>open-meteo.com — {t('privacy_third_weather', language)}</li>
            <li>hexdb.io — {t('privacy_third_hexdb', language)}</li>
            <li>planespotters.net — {t('privacy_third_photos', language)}</li>
            <li>cartocdn.com / openstreetmap.org / opentopomap.org — {t('privacy_third_tiles', language)}</li>
            <li>tilecache.rainviewer.com — {t('privacy_third_radar', language)}</li>
          </ul>
        </Card>
      </FadeIn>

      <FadeIn delay={240}>
        <Card title={t('privacy_rights_title', language)} className="mt-4">
          <p className="text-xs text-[var(--text-secondary)]">
            {t('privacy_rights_body', language)}
          </p>
        </Card>
      </FadeIn>

      <p className="text-[10px] text-[var(--text-muted)] tracking-widest text-center pt-4 pb-2">
        {t('privacy_last_updated', language)} · 2026-05-10
      </p>
    </PageContainer>
  );
}
