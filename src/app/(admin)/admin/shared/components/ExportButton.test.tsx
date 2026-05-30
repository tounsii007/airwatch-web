// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { ExportButton } from './ExportButton';

// useToast() returns no-ops outside its provider, so we mock the module to
// capture the success/error calls the component makes.
const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('@/app/(admin)/Toast', () => ({ useToast: () => toast }));

/** A 200 OK CSV response, optionally carrying a Content-Disposition. */
function csvResponse(body: string, contentDisposition?: string): Response {
  const headers: Record<string, string> = {};
  if (contentDisposition) headers['content-disposition'] = contentDisposition;
  return new Response(body, { status: 200, headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  // happy-dom has no Blob URL plumbing — stub it and watch the lifecycle.
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
  // Anchor.click() would attempt a navigation; neutralise it.
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<ExportButton />', () => {
  it('renders the default label and a title hint from the filename', () => {
    render(<ExportButton href="/admin/api/export/audit.csv" filename="audit.csv" />);
    const btn = screen.getByRole('button', { name: 'Export CSV' });
    expect(btn).toHaveAttribute('title', 'Download audit.csv');
    expect(btn).not.toBeDisabled();
  });

  it('renders a custom label', () => {
    render(
      <ExportButton href="/x.csv" filename="x.csv" label="Download audit log" />,
    );
    expect(
      screen.getByRole('button', { name: 'Download audit log' }),
    ).toBeInTheDocument();
  });

  it('fetches with the session cookie and names the file from Content-Disposition', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () =>
      csvResponse('a,b\n1,2', 'attachment; filename="audit-2026.csv"'),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    render(
      <ExportButton href="/admin/api/export/audit.csv" filename="fallback.csv" />,
    );
    await user.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Downloaded audit-2026.csv'),
    );
    expect(fetchMock).toHaveBeenCalledWith('/admin/api/export/audit.csv', {
      credentials: 'same-origin',
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    // The object URL is always revoked after the click.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('falls back to the prop filename when no Content-Disposition is sent', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async () => csvResponse('x')) as typeof fetch;

    render(<ExportButton href="/x.csv" filename="report.csv" />);
    await user.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Downloaded report.csv'),
    );
  });

  it('falls back when Content-Disposition has no filename token', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async () =>
      csvResponse('x', 'attachment'),
    ) as typeof fetch;

    render(<ExportButton href="/x.csv" filename="report.csv" />);
    await user.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Downloaded report.csv'),
    );
  });

  it('toasts an error and skips the download on a non-OK response', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(
      async () => new Response('nope', { status: 503 }),
    ) as typeof fetch;

    render(<ExportButton href="/x.csv" filename="x.csv" />);
    await user.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Export failed (503)'),
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('toasts a generic error when the request rejects', async () => {
    const user = userEvent.setup();
    globalThis.fetch = vi.fn(async () => {
      throw new Error('offline');
    }) as typeof fetch;

    render(<ExportButton href="/x.csv" filename="x.csv" />);
    await user.click(screen.getByRole('button'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Network error during export'),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows a busy state while the request is in flight, then recovers', async () => {
    const user = userEvent.setup();
    let release!: (r: Response) => void;
    globalThis.fetch = vi.fn(
      () => new Promise<Response>((res) => { release = res; }),
    ) as unknown as typeof fetch;

    render(<ExportButton href="/x.csv" filename="x.csv" />);
    await user.click(screen.getByRole('button'));

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent('Exporting…');

    await act(async () => {
      release(csvResponse('a,b'));
    });

    await waitFor(() =>
      expect(screen.getByRole('button')).not.toBeDisabled(),
    );
    expect(screen.getByRole('button')).toHaveTextContent('Export CSV');
  });

  it('ignores a second click while a download is already running', async () => {
    const user = userEvent.setup();
    let release!: (r: Response) => void;
    const fetchMock = vi.fn(
      () => new Promise<Response>((res) => { release = res; }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<ExportButton href="/x.csv" filename="x.csv" />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    await user.click(btn); // disabled + busy-guarded → no-op

    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Let the in-flight request settle to avoid a dangling promise.
    await act(async () => {
      release(csvResponse('a'));
    });
  });

  it('applies compact sizing when compact is set', () => {
    render(<ExportButton href="/x.csv" filename="x.csv" compact />);
    const btn = screen.getByRole('button');
    expect(btn.style.fontSize).toBe('0.65rem');
    expect(btn.style.padding).toBe('0.25rem 0.55rem');
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <ExportButton href="/x.csv" filename="x.csv" />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
