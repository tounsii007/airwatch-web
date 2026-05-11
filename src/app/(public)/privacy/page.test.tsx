// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { loadLocale } from '@/lib/i18n/translations';
import PrivacyPage from './page';

// de + fr are lazy-loaded; pre-load them so the cross-locale tests
// don't see raw translation keys.
beforeAll(async () => {
  await loadLocale('de');
  await loadLocale('fr');
});

describe('<PrivacyPage />', () => {
  it('renders the title and key sections', () => {
    useSettingsStore.setState({ language: 'en' });
    render(<PrivacyPage />);
    expect(screen.getByText(/Privacy.*data/i)).toBeInTheDocument();
    expect(screen.getByText(/Stored in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/Stored on the AirWatch server/i)).toBeInTheDocument();
    expect(screen.getByText(/Third-party services we proxy/i)).toBeInTheDocument();
    expect(screen.getByText(/Your rights/i)).toBeInTheDocument();
  });

  it('lists every persisted localStorage key with a purpose row', () => {
    useSettingsStore.setState({ language: 'en' });
    render(<PrivacyPage />);
    // Each key the rest of the codebase actually persists must appear
    // here verbatim — the page is the single source of truth and a
    // reviewer should be able to grep for the key name and find it.
    for (const key of [
      'airwatch.client-id',
      'airwatch-favorites',
      'airwatch-stats',
      'airwatch-settings',
      'airwatch-geofences',
    ]) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
  });

  it('lists every external upstream the api proxies', () => {
    useSettingsStore.setState({ language: 'en' });
    const { container } = render(<PrivacyPage />);
    // Multiple ancestors of the <li> may match a function matcher,
    // so just assert the host name appears at least once in the rendered
    // body — that's the contract reviewers grep for.
    const body = container.textContent ?? '';
    for (const host of [
      'airlabs.co',
      'open-meteo.com',
      'hexdb.io',
      'planespotters.net',
      'tilecache.rainviewer.com',
    ]) {
      expect(body).toContain(host);
    }
  });

  it('renders in German when the settings language is de', () => {
    useSettingsStore.setState({ language: 'de' });
    render(<PrivacyPage />);
    expect(screen.getByText('Datenschutz & Daten')).toBeInTheDocument();
    expect(screen.getByText(/In deinem Browser gespeichert/)).toBeInTheDocument();
  });

  it('renders in French when the settings language is fr', () => {
    useSettingsStore.setState({ language: 'fr' });
    render(<PrivacyPage />);
    expect(screen.getByText(/Confidentialité/)).toBeInTheDocument();
    expect(screen.getByText(/Stocké dans ton navigateur/)).toBeInTheDocument();
  });

  it('shows the "no account" guarantee', () => {
    useSettingsStore.setState({ language: 'en' });
    render(<PrivacyPage />);
    expect(screen.getByText(/No accounts, no profiles, no email/i)).toBeInTheDocument();
  });
});
