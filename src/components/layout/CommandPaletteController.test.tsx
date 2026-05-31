// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommandPaletteController } from './CommandPaletteController';

// Stub the palette to a lightweight open-reporter so this test focuses
// purely on the controller's hotkey state machine.
vi.mock('@/components/layout/CommandPalette', () => ({
  CommandPalette: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="palette">
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}));

const palette = () => screen.queryByTestId('palette');

describe('<CommandPaletteController />', () => {
  it('starts with the palette closed', () => {
    render(<CommandPaletteController />);
    expect(palette()).toBeNull();
  });

  it('opens on Cmd+K and prevents the browser default', () => {
    render(<CommandPaletteController />);
    const notDefaulted = fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(palette()).toBeInTheDocument();
    expect(notDefaulted).toBe(false); // preventDefault() was called
  });

  it('opens on Ctrl+K as well', () => {
    render(<CommandPaletteController />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(palette()).toBeInTheDocument();
  });

  it('treats the hotkey case-insensitively', () => {
    render(<CommandPaletteController />);
    fireEvent.keyDown(document, { key: 'K', metaKey: true });
    expect(palette()).toBeInTheDocument();
  });

  it('toggles shut on a second Cmd+K', () => {
    render(<CommandPaletteController />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(palette()).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(palette()).toBeNull();
  });

  it('opens on a bare "/" when nothing is being typed into', () => {
    render(<CommandPaletteController />);
    fireEvent.keyDown(document.body, { key: '/' });
    expect(palette()).toBeInTheDocument();
  });

  it('ignores "/" while an input field is focused', () => {
    render(
      <>
        <input data-testid="field" />
        <CommandPaletteController />
      </>,
    );
    fireEvent.keyDown(screen.getByTestId('field'), { key: '/' });
    expect(palette()).toBeNull();
  });

  it('closes when the palette requests it', () => {
    render(<CommandPaletteController />);
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(palette()).toBeNull();
  });
});
