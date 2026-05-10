// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const hookState = {
  status: 'default' as 'unsupported' | 'unconfigured' | 'denied' | 'default' | 'granted',
  busy: false,
  error: null as string | null,
  subscribed: false,
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
};

vi.mock('@/lib/push/usePushSubscription', () => ({
  usePushSubscription: () => hookState,
}));

import { NotificationsSection } from './NotificationsSection';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';

describe('<NotificationsSection />', () => {
  beforeEach(() => {
    Object.assign(hookState, {
      status: 'default',
      busy: false,
      error: null,
      subscribed: false,
    });
    hookState.subscribe.mockClear();
    hookState.unsubscribe.mockClear();
    useFavoritesStore.setState({ items: [] });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('renders nothing when the platform is unsupported', () => {
    hookState.status = 'unsupported';
    const { container } = render(<NotificationsSection language="en" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no VAPID key is configured', () => {
    hookState.status = 'unconfigured';
    const { container } = render(<NotificationsSection language="en" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows ENABLE button when not subscribed; clicking calls subscribe()', async () => {
    const user = userEvent.setup();
    render(<NotificationsSection language="en" />);
    const btn = screen.getByRole('button', { name: /enable/i });
    await user.click(btn);
    expect(hookState.subscribe).toHaveBeenCalledOnce();
  });

  it('shows DISABLE + active status when subscribed; clicking calls unsubscribe()', async () => {
    hookState.subscribed = true;
    const user = userEvent.setup();
    render(<NotificationsSection language="en" />);
    expect(screen.getByText(/Push notifications active/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /disable/i }));
    expect(hookState.unsubscribe).toHaveBeenCalledOnce();
  });

  it('disables the toggle and shows the denied hint when permission is denied', () => {
    hookState.status = 'denied';
    render(<NotificationsSection language="en" />);
    expect(screen.getByText(/Blocked in browser settings/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enable/i })).toBeDisabled();
  });

  it('surfaces the favorites count in the hint', () => {
    useFavoritesStore.setState({
      items: [{ id: 'a', type: 'flight', label: 'A', addedAt: 0 } as never,
              { id: 'b', type: 'flight', label: 'B', addedAt: 0 } as never],
    });
    render(<NotificationsSection language="en" />);
    expect(screen.getByText(/your 2 starred flights/i)).toBeInTheDocument();
  });

  it('surfaces a hook error inline', () => {
    hookState.error = 'api 503';
    render(<NotificationsSection language="en" />);
    expect(screen.getByText('api 503')).toBeInTheDocument();
  });
});
