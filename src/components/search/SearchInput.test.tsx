// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from '@/components/search/SearchInput';

describe('<SearchInput />', () => {
  it('renders the placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Find flight" autoFocus={false} />);
    expect(screen.getByPlaceholderText('Find flight')).toBeInTheDocument();
  });

  it('fires onChange on typing', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} autoFocus={false} />);

    await userEvent.type(screen.getByRole('textbox'), 'LH');
    expect(onChange).toHaveBeenCalled();
    // userEvent types char-by-char; last call reflects final char.
    expect(onChange.mock.calls.at(-1)?.[0]).toBe('H');
  });

  it('shows the clear button only when there is a value', () => {
    const { rerender } = render(<SearchInput value="" onChange={() => {}} autoFocus={false} />);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<SearchInput value="LH" onChange={() => {}} autoFocus={false} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('clear button calls onChange with empty string', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="LH400" onChange={onChange} autoFocus={false} />);

    await userEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('focuses the input when autoFocus is true', () => {
    render(<SearchInput value="" onChange={() => {}} autoFocus />);
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});
