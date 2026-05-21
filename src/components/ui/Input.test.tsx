// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('<Input />', () => {
  it('renders the label associated with the input', () => {
    render(<Input label="Callsign" value="" onChange={() => {}} />);
    const input = screen.getByLabelText('Callsign');
    expect(input).toBeInTheDocument();
  });

  it('calls onChange with the new value', async () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} aria-label="Search" />);
    await userEvent.type(screen.getByLabelText('Search'), 'DLH');
    expect(onChange).toHaveBeenCalled();
    // last char typed
    expect(onChange.mock.calls.at(-1)?.[0]).toBe('H');
  });

  it('shows the clear button when clearable + value present, clears on click', async () => {
    const onChange = vi.fn();
    render(<Input value="LH123" onChange={onChange} clearable aria-label="q" />);
    const clear = screen.getByRole('button', { name: 'Clear input' });
    await userEvent.click(clear);
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('does not show the clear button when value is empty', () => {
    render(<Input value="" onChange={() => {}} clearable aria-label="q" />);
    expect(screen.queryByRole('button', { name: 'Clear input' })).not.toBeInTheDocument();
  });

  it('marks aria-invalid and shows the error message', () => {
    render(
      <Input
        value=""
        onChange={() => {}}
        aria-label="q"
        error="Must be at least 3 characters"
      />,
    );
    const input = screen.getByLabelText('q');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Must be at least 3 characters')).toBeInTheDocument();
  });

  it('renders the hint when no error is set', () => {
    render(<Input value="" onChange={() => {}} aria-label="q" hint="Helpful tip" />);
    expect(screen.getByText('Helpful tip')).toBeInTheDocument();
  });

  it('error takes precedence over hint', () => {
    render(
      <Input
        value=""
        onChange={() => {}}
        aria-label="q"
        hint="Tip"
        error="Bad"
      />,
    );
    expect(screen.queryByText('Tip')).not.toBeInTheDocument();
    expect(screen.getByText('Bad')).toBeInTheDocument();
  });
});
