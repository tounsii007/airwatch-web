// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { TickingValue } from './TickingValue';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('<TickingValue />', () => {
  it('renders the placeholder when value is null/undefined', () => {
    const { container, rerender } = render(<TickingValue value={null} />);
    expect(container.textContent).toBe('—');
    rerender(<TickingValue value={undefined} placeholder="N/A" />);
    expect(container.textContent).toBe('N/A');
  });

  it('renders numeric and string values via String() coercion', () => {
    const { container, rerender } = render(<TickingValue value={42} />);
    expect(container.textContent).toBe('42');
    rerender(<TickingValue value="36.1k ft" />);
    expect(container.textContent).toBe('36.1k ft');
  });

  it('flashes when the value changes', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<TickingValue value="100" flashClass="my-flash" />);
    const span = container.querySelector('span') as HTMLSpanElement;
    expect(span.className).not.toContain('my-flash');

    rerender(<TickingValue value="200" flashClass="my-flash" />);
    expect(span.className).toContain('my-flash');

    // After the flash duration the class clears.
    vi.advanceTimersByTime(1500);
    rerender(<TickingValue value="200" flashClass="my-flash" />);
    expect(container.querySelector('span')!.className).not.toContain('my-flash');
  });

  it('does NOT flash on a re-render with the same value', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<TickingValue value="100" flashClass="my-flash" />);
    rerender(<TickingValue value="100" flashClass="my-flash" />);
    rerender(<TickingValue value="100" flashClass="my-flash" />);
    const span = container.querySelector('span') as HTMLSpanElement;
    // Flash never applied because the displayed value never changed.
    expect(span.className).not.toContain('my-flash');
  });

  it('honours flashDurationMs', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <TickingValue value="A" flashClass="boom" flashDurationMs={500} />,
    );
    rerender(<TickingValue value="B" flashClass="boom" flashDurationMs={500} />);
    expect(container.querySelector('span')!.className).toContain('boom');

    vi.advanceTimersByTime(499);
    expect(container.querySelector('span')!.className).toContain('boom');

    vi.advanceTimersByTime(2);
    rerender(<TickingValue value="B" flashClass="boom" flashDurationMs={500} />);
    expect(container.querySelector('span')!.className).not.toContain('boom');
  });
});
