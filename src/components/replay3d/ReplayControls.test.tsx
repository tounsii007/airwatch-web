// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { ReplayControls, type SpeedOption } from './ReplayControls';

vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));
vi.mock('@/lib/stores/settingsStore', () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: 'en' }),
}));

const X = '×'; // multiplication sign used by the speed chips

function renderControls(
  overrides: Partial<React.ComponentProps<typeof ReplayControls>> = {},
) {
  const props = {
    playing: false,
    speed: 1 as SpeedOption,
    currentTimeMs: 0,
    durationMs: 605_000,
    atEnd: false,
    onTogglePlay: vi.fn(),
    onRestart: vi.fn(),
    onSpeedChange: vi.fn(),
    onSeek: vi.fn(),
    ...overrides,
  };
  const utils = render(<ReplayControls {...props} />);
  return { ...utils, props };
}

describe('<ReplayControls />', () => {
  it('renders the current position and total duration as elapsed clocks', () => {
    renderControls({ currentTimeMs: 65_000, durationMs: 605_000 });
    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.getByText('10:05')).toBeInTheDocument();
  });

  it('shows a play affordance and toggles playback when stopped', () => {
    const { props } = renderControls({ playing: false, atEnd: false });
    const primary = screen.getByRole('button', { name: 'replay_play' });
    fireEvent.click(primary);
    expect(props.onTogglePlay).toHaveBeenCalledTimes(1);
    expect(props.onRestart).not.toHaveBeenCalled();
  });

  it('shows a pause affordance while playing', () => {
    const { props } = renderControls({ playing: true, atEnd: false });
    fireEvent.click(screen.getByRole('button', { name: 'replay_pause' }));
    expect(props.onTogglePlay).toHaveBeenCalledTimes(1);
  });

  it('offers restart at the end and calls onRestart instead of toggling play', () => {
    const { props } = renderControls({ playing: false, atEnd: true });
    const primary = screen.getByRole('button', { name: 'replay_restart' });
    fireEvent.click(primary);
    expect(props.onRestart).toHaveBeenCalledTimes(1);
    expect(props.onTogglePlay).not.toHaveBeenCalled();
  });

  it('renders a chip for every speed option', () => {
    renderControls();
    for (const v of [1, 10, 60, 300]) {
      expect(screen.getByText(`${v}${X}`)).toBeInTheDocument();
    }
  });

  it('highlights only the active speed chip', () => {
    renderControls({ speed: 10 });
    expect(screen.getByText(`10${X}`).className).toContain('bg-[var(--primary)]/15');
    expect(screen.getByText(`1${X}`).className).not.toContain('bg-[var(--primary)]/15');
  });

  it('reports the chosen speed through onSpeedChange', () => {
    const { props } = renderControls({ speed: 1 });
    fireEvent.click(screen.getByText(`60${X}`));
    expect(props.onSpeedChange).toHaveBeenCalledWith(60);
  });

  it('exposes the scrubber as a slider bounded by the duration', () => {
    renderControls({ currentTimeMs: 0, durationMs: 605_000 });
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.getAttribute('min')).toBe('0');
    expect(slider.getAttribute('max')).toBe('605000');
    expect(slider.value).toBe('0');
  });

  it('clamps the scrubber thumb to the duration when the clock overshoots', () => {
    renderControls({ currentTimeMs: 999_999, durationMs: 120_000 });
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.value).toBe('120000');
  });

  it('seeks to the dragged position', () => {
    const { props } = renderControls({ durationMs: 605_000 });
    fireEvent.change(screen.getByRole('slider'), { target: { value: '30000' } });
    expect(props.onSeek).toHaveBeenCalledWith(30_000);
  });

  it('has no axe violations', async () => {
    const { container } = renderControls();
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
