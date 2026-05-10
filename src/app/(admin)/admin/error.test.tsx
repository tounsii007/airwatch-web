// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminError from './error';

describe('<AdminError />', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () => new Response('', { status: 200 }));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the alert with role=alert + assertive aria-live', () => {
    render(<AdminError error={new Error('boom')} reset={() => {}} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.getAttribute('aria-live')).toBe('assertive');
  });

  it('shows the digest ref when supplied', () => {
    const err = Object.assign(new Error('x'), { digest: 'a1b2c3d4' });
    render(<AdminError error={err} reset={() => {}} />);
    expect(screen.getByText(/digest: a1b2c3d4/)).toBeInTheDocument();
  });

  it('omits the digest line when error has no digest', () => {
    render(<AdminError error={new Error('x')} reset={() => {}} />);
    expect(screen.queryByText(/digest:/)).toBeNull();
  });

  it('posts the error report to /admin/api/frontend-errors with admin-shell-render kind', async () => {
    const err = Object.assign(new Error('boom'), { digest: 'abc' });
    err.stack = 'Error: boom\n    at fn (/admin/dashboard:1:1)';

    render(<AdminError error={err} reset={() => {}} />);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/admin/api/frontend-errors');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(init.keepalive).toBe(true);

    const body = JSON.parse(init.body as string);
    expect(body.message).toBe('boom');
    expect(body.digest).toBe('abc');
    expect(body.kind).toBe('admin-shell-render');
    expect(body.stack).toContain('Error: boom');
  });

  it('truncates very long stack traces before posting', () => {
    const big = 'x'.repeat(20_000);
    const err = Object.assign(new Error('big'), { stack: big });

    render(<AdminError error={err} reset={() => {}} />);

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.stack.length).toBeLessThanOrEqual(8000);
  });

  it('swallows fetch failures without re-throwing into the same boundary', () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('net'); }) as unknown as typeof fetch;
    // The render call itself must not throw.
    expect(() => render(<AdminError error={new Error('boom')} reset={() => {}} />))
      .not.toThrow();
  });

  it('Retry button calls reset()', async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<AdminError error={new Error('x')} reset={reset} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('Back-to-dashboard link points at /admin/dashboard', () => {
    render(<AdminError error={new Error('x')} reset={() => {}} />);
    const link = screen.getByRole('link', { name: /back to dashboard/i });
    expect(link.getAttribute('href')).toBe('/admin/dashboard');
  });

  it('Stack trace is hidden in a <details> by default', () => {
    const err = Object.assign(new Error('boom'), { stack: 'Error: boom\n    at fn (/x:1:1)' });
    render(<AdminError error={err} reset={() => {}} />);
    const details = screen.getByText(/stack trace/i).closest('details');
    expect(details).not.toBeNull();
    expect(details?.hasAttribute('open')).toBe(false);
  });
});
