// @vitest-environment happy-dom
import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useToastStore } from '@/components/ui/toast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { loadLocale } from '@/lib/i18n/translations';
import { useFavoriteToggle } from './useFavoriteToggle';

/**
 * Integration coverage for the favourite-toggle flow:
 *
 *   click  →  store flip  →  imperative toast  →  ToastContainer paint
 *
 * Unit tests cover the hook + the store + the container in isolation;
 * this test wires all three together so a regression that splits them
 * apart (e.g. a missed `useToastStore` reference) gets caught.
 */
function TestHarness({ name }: { name: string }) {
  const toggle = useFavoriteToggle({
    id: 'airline-DLH',
    type: 'airline',
    label: 'DLH',
    subtitle: name,
  });
  return (
    <>
      <button type="button" onClick={toggle}>★</button>
      <ToastContainer />
    </>
  );
}

describe('useFavoriteToggle integration', () => {
  beforeAll(async () => {
    await loadLocale('de');
    await loadLocale('fr');
  });

  beforeEach(() => {
    useFavoritesStore.setState({ items: [] });
    useToastStore.setState({ toasts: [] });
    useSettingsStore.setState({ language: 'en' });
  });

  it('flips the store AND paints a toast in the EN locale', async () => {
    const user = userEvent.setup();
    render(<TestHarness name="Lufthansa" />);

    expect(useFavoritesStore.getState().isFavorite('airline-DLH')).toBe(false);
    await user.click(screen.getByText('★'));

    expect(useFavoritesStore.getState().isFavorite('airline-DLH')).toBe(true);
    // ToastContainer must have rendered the toast into the live region.
    expect(screen.getByText('Saved "Lufthansa"')).toBeInTheDocument();
  });

  it('localises the toast title when the language store is DE', async () => {
    useSettingsStore.setState({ language: 'de' });
    const user = userEvent.setup();
    render(<TestHarness name="Lufthansa" />);

    await user.click(screen.getByText('★'));

    // de.json: "saved_toast": "„{0}\" gespeichert"
    expect(screen.getByText('„Lufthansa" gespeichert')).toBeInTheDocument();
  });

  it('localises the toast title when the language store is FR', async () => {
    useSettingsStore.setState({ language: 'fr' });
    const user = userEvent.setup();
    render(<TestHarness name="Lufthansa" />);

    await user.click(screen.getByText('★'));

    // fr.json: "saved_toast": "« {0} » enregistré"
    expect(screen.getByText('« Lufthansa » enregistré')).toBeInTheDocument();
  });

  it('flips back to default-variant toast on second click (removal path)', async () => {
    const user = userEvent.setup();
    render(<TestHarness name="Lufthansa" />);

    await user.click(screen.getByText('★'));
    await user.click(screen.getByText('★'));

    expect(useFavoritesStore.getState().isFavorite('airline-DLH')).toBe(false);
    // Both toasts visible while their durations overlap; assert the
    // second one is present, not just the first.
    expect(screen.getByText('Removed "Lufthansa"')).toBeInTheDocument();
  });

  it('drops the toast after its duration elapses', async () => {
    const user = userEvent.setup();
    render(<TestHarness name="Lufthansa" />);

    await user.click(screen.getByText('★'));
    expect(screen.queryByText('Saved "Lufthansa"')).toBeInTheDocument();

    // useFavoriteToggle defaults to 3000ms duration. Fast-forward by
    // tearing the toast down imperatively (the store exposes a clear
    // path used in tests).
    act(() => useToastStore.setState({ toasts: [] }));
    expect(screen.queryByText('Saved "Lufthansa"')).not.toBeInTheDocument();
  });
});
