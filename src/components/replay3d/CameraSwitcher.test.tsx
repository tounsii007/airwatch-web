// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { CAMERA_MODE_META, type CameraMode } from './cameraModes';
import { CameraSwitcher } from './CameraSwitcher';

describe('<CameraSwitcher />', () => {
  it('renders one pill per camera mode using its label', () => {
    render(<CameraSwitcher mode="chase" onChange={() => {}} />);
    for (const { label } of CAMERA_MODE_META) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('marks only the active mode with the primary fill', () => {
    render(<CameraSwitcher mode="top" onChange={() => {}} />);
    const active = screen.getByRole('button', { name: 'TOP' });
    const inactive = screen.getByRole('button', { name: 'CHASE' });
    expect(active.className).toContain('bg-[var(--primary)]');
    expect(inactive.className).not.toContain('bg-[var(--primary)]');
  });

  it('moves the active highlight when the mode prop changes', () => {
    const { rerender } = render(<CameraSwitcher mode="chase" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'CHASE' }).className).toContain(
      'bg-[var(--primary)]',
    );
    rerender(<CameraSwitcher mode="free" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'CHASE' }).className).not.toContain(
      'bg-[var(--primary)]',
    );
    expect(screen.getByRole('button', { name: 'FREE' }).className).toContain(
      'bg-[var(--primary)]',
    );
  });

  it('reports the chosen mode through onChange', () => {
    const onChange = vi.fn();
    render(<CameraSwitcher mode="chase" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'FREE' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith<[CameraMode]>('free');
  });

  it('still fires onChange when the active pill is re-selected', () => {
    const onChange = vi.fn();
    render(<CameraSwitcher mode="top" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'TOP' }));
    expect(onChange).toHaveBeenCalledWith('top');
  });

  it('has no axe violations', async () => {
    const { container } = render(<CameraSwitcher mode="chase" onChange={() => {}} />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
