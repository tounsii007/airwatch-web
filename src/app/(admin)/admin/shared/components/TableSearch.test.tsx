// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { TableSearch } from './TableSearch';

// A stable router/params holder the next/navigation mock reads from. Keeping
// the router + params object identities stable across renders means the
// debounce effect only re-runs when the *input value* changes, not on every
// incidental re-render.
const nav = vi.hoisted(() => {
  const replace = vi.fn();
  return {
    replace,
    router: { replace, push: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() },
    params: new URLSearchParams(),
    pathname: '/admin/audit',
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => nav.router,
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.params,
}));

/** The search-params of the Nth router.replace(url) call. */
function pushedParams(call = 0): URLSearchParams {
  const url = nav.replace.mock.calls[call][0] as string;
  return new URLSearchParams(url.split('?')[1] ?? '');
}

/** The path (before '?') of the Nth router.replace(url) call. */
function pushedPath(call = 0): string {
  return (nav.replace.mock.calls[call][0] as string).split('?')[0];
}

beforeEach(() => {
  vi.useFakeTimers();
  nav.replace.mockClear();
  nav.params = new URLSearchParams();
  nav.pathname = '/admin/audit';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('<TableSearch />', () => {
  it('renders a searchbox whose accessible name is the placeholder', () => {
    render(<TableSearch placeholder="Search by user / IP…" />);
    expect(
      screen.getByRole('searchbox', { name: 'Search by user / IP…' }),
    ).toBeInTheDocument();
  });

  it('hydrates its value from the URL param and shows the clear button', () => {
    nav.params = new URLSearchParams('q=boot');
    render(<TableSearch placeholder="Find…" />);
    expect(screen.getByRole('searchbox', { name: 'Find…' })).toHaveValue('boot');
    expect(
      screen.getByRole('button', { name: 'Clear search' }),
    ).toBeInTheDocument();
  });

  it('does not push a URL change until the debounce window elapses', () => {
    render(<TableSearch />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'err' },
    });

    expect(nav.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(249));
    expect(nav.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it('pushes the trimmed query, resets page, and disables scroll restore', () => {
    nav.params = new URLSearchParams('page=5');
    render(<TableSearch />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: '  alice  ' },
    });
    act(() => vi.advanceTimersByTime(250));

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(pushedPath()).toBe('/admin/audit');
    const sp = pushedParams();
    expect(sp.get('q')).toBe('alice');
    expect(sp.has('page')).toBe(false);
    expect(nav.replace.mock.calls[0][1]).toEqual({ scroll: false });
  });

  it('only emits the final value when typing in quick succession', () => {
    render(<TableSearch />);
    const input = screen.getByRole('searchbox');

    fireEvent.change(input, { target: { value: 'a' } });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.change(input, { target: { value: 'ab' } });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.change(input, { target: { value: 'abc' } });
    // Neither intermediate value crossed the 250ms threshold on its own.
    expect(nav.replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(250));
    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(pushedParams().get('q')).toBe('abc');
  });

  it('clearing the text down to empty deletes the param', () => {
    nav.params = new URLSearchParams('q=old');
    render(<TableSearch />);
    const input = screen.getByRole('searchbox');
    expect(input).toHaveValue('old');

    fireEvent.change(input, { target: { value: '' } });
    act(() => vi.advanceTimersByTime(250));

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(pushedParams().has('q')).toBe(false);
  });

  it('is a no-op when the typed value already matches the URL param', () => {
    nav.params = new URLSearchParams('q=stable');
    render(<TableSearch />);
    expect(screen.getByRole('searchbox')).toHaveValue('stable');

    act(() => vi.advanceTimersByTime(500));
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('drives a custom paramName instead of the default "q"', () => {
    render(<TableSearch paramName="ip" />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: '10.0.0.1' },
    });
    act(() => vi.advanceTimersByTime(250));

    const sp = pushedParams();
    expect(sp.get('ip')).toBe('10.0.0.1');
    expect(sp.has('q')).toBe(false);
  });

  it('preserves unrelated params while still resetting page', () => {
    nav.params = new URLSearchParams('tab=errors&page=7');
    render(<TableSearch />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'x' },
    });
    act(() => vi.advanceTimersByTime(250));

    const sp = pushedParams();
    expect(sp.get('tab')).toBe('errors');
    expect(sp.get('q')).toBe('x');
    expect(sp.has('page')).toBe(false);
  });

  it('honours a custom debounceMs', () => {
    render(<TableSearch debounceMs={500} />);
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'slow' },
    });

    act(() => vi.advanceTimersByTime(499));
    expect(nav.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(nav.replace).toHaveBeenCalledTimes(1);
  });

  it('hides the clear button while the field is empty', () => {
    render(<TableSearch />);
    expect(
      screen.queryByRole('button', { name: 'Clear search' }),
    ).not.toBeInTheDocument();
  });

  it('the clear button wipes the query immediately (no debounce)', () => {
    nav.params = new URLSearchParams('q=foo&page=2');
    render(<TableSearch />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(nav.replace).toHaveBeenCalledTimes(1);
    const sp = pushedParams();
    expect(sp.has('q')).toBe(false);
    expect(sp.has('page')).toBe(false);
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('has no axe violations', async () => {
    vi.useRealTimers();
    const { container } = render(
      <TableSearch placeholder="Search audit log…" />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
