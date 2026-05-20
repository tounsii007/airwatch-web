// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { toast, useToastStore } from '@/components/ui/toast';

describe('<ToastContainer />', () => {
  afterEach(() => {
    useToastStore.getState().dismissAll();
  });

  it('renders nothing when the queue is empty', () => {
    const { container } = render(<ToastContainer />);
    expect(container.firstChild).toBeNull();
  });

  it('renders queued toasts and dismisses on the close button', async () => {
    render(<ToastContainer />);
    act(() => {
      toast.success('Saved');
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();

    const close = screen.getByRole('button', { name: 'Dismiss notification' });
    await userEvent.click(close);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('uses role=alert for error toasts and role=status otherwise', () => {
    render(<ToastContainer />);
    act(() => {
      toast.error('Boom');
      toast.success('OK');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.getAllByRole('status').some((n) => n.textContent?.includes('OK'))).toBe(true);
  });
});
