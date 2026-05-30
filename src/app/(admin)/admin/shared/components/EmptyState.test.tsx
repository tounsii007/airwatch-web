// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { EmptyState } from './EmptyState';

describe('<EmptyState />', () => {
  it('renders the title inside a status live-region', () => {
    render(<EmptyState title="No flights yet" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No flights yet');
  });

  it('shows the default wave glyph and lets it be overridden', () => {
    const { unmount } = render(<EmptyState title="X" />);
    expect(screen.getByText('〰')).toBeInTheDocument();
    unmount();

    render(<EmptyState title="X" icon="🚨" />);
    expect(screen.getByText('🚨')).toBeInTheDocument();
  });

  it('renders the hint when provided and omits it otherwise', () => {
    const { unmount } = render(
      <EmptyState title="X" hint="Try widening the time range." />,
    );
    expect(
      screen.getByText('Try widening the time range.'),
    ).toBeInTheDocument();
    unmount();

    render(<EmptyState title="X" />);
    expect(screen.queryByText('Try widening the time range.')).toBeNull();
  });

  it('renders the action as a link with its href and label', () => {
    render(
      <EmptyState
        title="No data"
        action={{ label: 'View logs', href: '/admin/logs' }}
      />,
    );
    const link = screen.getByRole('link', { name: 'View logs' });
    expect(link).toHaveAttribute('href', '/admin/logs');
  });

  it('renders no link when no action is given', () => {
    render(<EmptyState title="No data" />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('tints the icon by tone', () => {
    const { unmount } = render(<EmptyState title="X" tone="error" />);
    expect(screen.getByText('〰').style.color).toBe('var(--error)');
    unmount();

    render(<EmptyState title="X" tone="warning" />);
    expect(screen.getByText('〰').style.color).toBe('var(--warning)');
  });

  it('defaults to the calm tone', () => {
    render(<EmptyState title="X" />);
    expect(screen.getByText('〰').style.color).toBe('var(--text-muted)');
  });

  it('has no axe violations with a hint and action', async () => {
    const { container } = render(
      <EmptyState
        title="No data"
        hint="Nothing matched your filter."
        action={{ label: 'Reset', href: '/admin' }}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
