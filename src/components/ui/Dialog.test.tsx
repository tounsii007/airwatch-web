// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from '@/components/ui/Dialog';

describe('<Dialog />', () => {
  it('renders nothing when closed', () => {
    render(<Dialog open={false} onClose={() => {}}>x</Dialog>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title + body when open', () => {
    render(
      <Dialog open onClose={() => {}} title="Confirm">
        <p>body copy</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByText('body copy')).toBeInTheDocument();
  });

  it('Esc triggers onClose when dismissible', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="X">
        body
      </Dialog>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Esc does NOT trigger onClose when dismissible=false', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="X" dismissible={false}>
        body
      </Dialog>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clicking the backdrop closes when dismissible', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <Dialog open onClose={onClose} title="X">
        body
      </Dialog>,
    );
    // The outermost div is the backdrop.
    const backdrop = container.firstChild as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clicking inside the panel does NOT close', async () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="X">
        <button>inside</button>
      </Dialog>,
    );
    await userEvent.click(screen.getByText('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('hides the close button when dismissible=false', () => {
    render(
      <Dialog open onClose={() => {}} title="X" dismissible={false}>
        body
      </Dialog>,
    );
    expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();
  });

  it('renders the footer slot when provided', () => {
    render(
      <Dialog open onClose={() => {}} footer={<button>OK</button>}>
        body
      </Dialog>,
    );
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });
});
