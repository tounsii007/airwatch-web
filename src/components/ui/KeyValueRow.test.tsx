// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyValueRow } from '@/components/ui/KeyValueRow';

describe('<KeyValueRow />', () => {
  it('renders label and value', () => {
    render(<KeyValueRow label="Altitude" value="36 000 ft" />);
    expect(screen.getByText('Altitude')).toBeInTheDocument();
    expect(screen.getByText('36 000 ft')).toBeInTheDocument();
  });

  it('prefers children over value', () => {
    render(
      <KeyValueRow label="Status" value="ignored">
        <span data-testid="custom">EN-ROUTE</span>
      </KeyValueRow>,
    );
    expect(screen.getByTestId('custom')).toBeInTheDocument();
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();
  });

  it('shows a copy button only when copyable + value is a string', () => {
    const { rerender } = render(<KeyValueRow label="ICAO24" value="3C6AC2" />);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<KeyValueRow label="ICAO24" value="3C6AC2" copyable />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('copies the value to the clipboard and flips the icon', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<KeyValueRow label="ICAO24" value="3C6AC2" copyable />);
    await userEvent.click(screen.getByRole('button'));
    expect(writeText).toHaveBeenCalledWith('3C6AC2');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    });
  });

  it('renders the hint below the value', () => {
    render(
      <KeyValueRow label="Altitude" value="36 000 ft" hint="Approx. cruise" />,
    );
    expect(screen.getByText('Approx. cruise')).toBeInTheDocument();
  });
});
