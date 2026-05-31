// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureFlagsCard } from './FeatureFlagsCard';

// The Toast hook needs a provider; mock it so tests don't depend on the
// full provider tree.
const toastFns = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
vi.mock('@/app/(admin)/Toast', () => ({
  useToast: () => toastFns,
}));

const sampleFlags = {
  flags: {
    new_replay_3d: {
      key: 'new_replay_3d',
      label: 'Replay 3D',
      description: 'Use deck.gl globe in /replay',
      defaultEnabled: false,
      enabled: true,
      isOverridden: true,
    },
    legacy_logos: {
      key: 'legacy_logos',
      label: 'Legacy logos',
      description: 'Fall back to bundled logo set',
      defaultEnabled: false,
      enabled: false,
      isOverridden: false,
    },
  },
};

function mockFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => impl(url, init)) as unknown as typeof fetch;
}

describe('<FeatureFlagsCard />', () => {
  beforeEach(() => {
    Object.values(toastFns).forEach((fn) => fn.mockClear());
    mockFetch((url) => {
      if (url.endsWith('/admin/api/features/flags')) {
        return new Response(JSON.stringify(sampleFlags), { status: 200 });
      }
      return new Response('', { status: 200 });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders one row per flag with label, key, default badge and toggle', async () => {
    render(<FeatureFlagsCard csrfToken="csrf-1" />);
    await waitFor(() => screen.getByText('Replay 3D'));
    expect(screen.getByText('Legacy logos')).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(2);
    // The overridden flag has a Reset button; the non-overridden one doesn't.
    expect(screen.getByRole('button', { name: /^reset$/i })).toBeInTheDocument();
  });

  it('POSTs the toggle and reloads on switch click', async () => {
    const user = userEvent.setup();
    render(<FeatureFlagsCard csrfToken="csrf-1" />);
    await waitFor(() => screen.getByText('Legacy logos'));

    const calls: Array<{ url: string; method?: string; csrf?: string }> = [];
    mockFetch((url, init) => {
      calls.push({ url, method: init?.method, csrf: (init?.headers as Record<string, string> | undefined)?.['X-CSRF-Token'] });
      if (url.endsWith('/admin/api/features/flags')) {
        return new Response(JSON.stringify(sampleFlags), { status: 200 });
      }
      return new Response('{}', { status: 200 });
    });

    await user.click(screen.getByRole('switch', { name: /toggle legacy logos/i }));

    await waitFor(() => {
      const post = calls.find((c) => c.method === 'POST');
      expect(post).toBeDefined();
      expect(post?.url).toContain('/admin/api/features/flags/legacy_logos');
      expect(post?.url).toContain('enabled=true');
      // CSRF token must travel in the header, NOT the URL (log/referrer leak).
      expect(post?.url).not.toContain('_csrf');
      expect(post?.csrf).toBe('csrf-1');
    });
    expect(toastFns.success).toHaveBeenCalledOnce();
  });

  it('disables every toggle when csrfToken is empty', async () => {
    render(<FeatureFlagsCard csrfToken="" />);
    await waitFor(() => screen.getByText('Replay 3D'));
    for (const sw of screen.getAllByRole('switch')) {
      expect(sw).toBeDisabled();
    }
    // The Reset button is hidden entirely when csrf is missing.
    expect(screen.queryByRole('button', { name: /^reset$/i })).toBeNull();
  });

  it('shows an error toast on a failed toggle', async () => {
    const user = userEvent.setup();
    render(<FeatureFlagsCard csrfToken="csrf-1" />);
    await waitFor(() => screen.getByText('Legacy logos'));

    mockFetch((url, init) => {
      if (init?.method === 'POST') return new Response('boom', { status: 500 });
      return new Response(JSON.stringify(sampleFlags), { status: 200 });
    });

    await user.click(screen.getByRole('switch', { name: /toggle legacy logos/i }));
    await waitFor(() => {
      expect(toastFns.error).toHaveBeenCalledOnce();
    });
  });

  it('renders the empty-state copy when the catalog is empty', async () => {
    mockFetch(() => new Response(JSON.stringify({ flags: {} }), { status: 200 }));
    render(<FeatureFlagsCard csrfToken="csrf-1" />);
    await waitFor(() => {
      expect(screen.getByText(/no flags defined/i)).toBeInTheDocument();
    });
  });
});
