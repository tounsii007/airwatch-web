// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

/**
 * React prints a noisy error trace for every caught throw — we silence it per
 * test via `vi.spyOn` (not by reassigning `console.error`, which lints as an
 * immutable-global edit under strict type settings).
 */
describe('<ErrorBoundary />', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error', () => {
    render(<ErrorBoundary><div>happy path</div></ErrorBoundary>);
    expect(screen.getByText('happy path')).toBeInTheDocument();
  });

  it('renders the default fallback on a thrown error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Explode = () => { throw new Error('kaboom'); };
    render(<ErrorBoundary><Explode /></ErrorBoundary>);
    expect(screen.getByText(/SOMETHING WENT WRONG/i)).toBeInTheDocument();
    expect(screen.getByText(/kaboom/)).toBeInTheDocument();
  });

  it('uses a custom fallback render prop when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Explode = () => { throw new Error('specific'); };
    render(
      <ErrorBoundary fallback={(err) => <div>caught: {err.message}</div>}>
        <Explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText('caught: specific')).toBeInTheDocument();
  });

  it('resets state when the retry button is clicked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    const MaybeBoom = () => {
      if (shouldThrow) throw new Error('once');
      return <div>back to normal</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/SOMETHING WENT WRONG/i)).toBeInTheDocument();

    // Stop throwing, then re-render + click retry.
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: /TRY AGAIN/i }));
    rerender(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('back to normal')).toBeInTheDocument();
  });
});
