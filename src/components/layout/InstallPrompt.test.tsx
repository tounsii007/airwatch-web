// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallPrompt } from './InstallPrompt';
import { useSettingsStore } from '@/lib/stores/settingsStore';

const DISMISS_KEY = 'airwatch.install-prompt.dismissed-at';

function fireBeforeInstall(prompt = vi.fn().mockResolvedValue(undefined),
                          choice: Promise<{ outcome: 'accepted' | 'dismissed' }> = Promise.resolve({ outcome: 'accepted' })) {
  const ev = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  };
  ev.prompt = prompt;
  ev.userChoice = choice;
  window.dispatchEvent(ev);
  return ev;
}

describe('<InstallPrompt />', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
    try { localStorage.removeItem(DISMISS_KEY); } catch { /* */ }
    // Default to non-standalone display mode for the tests; explicit
    // overrides set this per-case via Object.defineProperty below.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('renders nothing until beforeinstallprompt fires', () => {
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the toast after beforeinstallprompt fires', async () => {
    render(<InstallPrompt />);
    await act(async () => { fireBeforeInstall(); });
    expect(screen.getByText('Install AirWatch')).toBeInTheDocument();
    // Two buttons match /install/i (the title + the action). Pin the
    // action by exact label.
    expect(screen.getByRole('button', { name: 'INSTALL' })).toBeInTheDocument();
  });

  it('clicking INSTALL fires the deferred prompt() then hides', async () => {
    const user = userEvent.setup();
    render(<InstallPrompt />);
    const promptFn = vi.fn().mockResolvedValue(undefined);
    await act(async () => { fireBeforeInstall(promptFn); });

    await user.click(screen.getByRole('button', { name: 'INSTALL' }));

    expect(promptFn).toHaveBeenCalledOnce();
    // Toast goes away after the prompt resolves.
    expect(screen.queryByText('Install AirWatch')).toBeNull();
  });

  it('dismiss button hides the toast and stamps localStorage so it stays hidden for 14 days', async () => {
    const user = userEvent.setup();
    render(<InstallPrompt />);
    await act(async () => { fireBeforeInstall(); });

    await user.click(screen.getByRole('button', { name: /dismiss install prompt/i }));

    expect(screen.queryByText('Install AirWatch')).toBeNull();
    const stored = localStorage.getItem(DISMISS_KEY);
    expect(stored).not.toBeNull();
    expect(Number(stored)).toBeGreaterThan(0);
  });

  it('does not re-show within the 14-day snooze window', async () => {
    // Stamp dismissal at "right now" so the next mount must respect it.
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    const { container } = render(<InstallPrompt />);
    await act(async () => { fireBeforeInstall(); });

    expect(container.firstChild).toBeNull();
  });

  it('hides when the page is launched in standalone display-mode', async () => {
    // Override matchMedia to claim standalone.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (q: string) => ({
        matches: q.includes('standalone'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    const { container } = render(<InstallPrompt />);
    await act(async () => { fireBeforeInstall(); });
    expect(container.firstChild).toBeNull();
  });

  it('hides when the appinstalled event fires', async () => {
    render(<InstallPrompt />);
    await act(async () => { fireBeforeInstall(); });
    expect(screen.getByText('Install AirWatch')).toBeInTheDocument();

    await act(async () => { window.dispatchEvent(new Event('appinstalled')); });
    expect(screen.queryByText('Install AirWatch')).toBeNull();
  });
});
