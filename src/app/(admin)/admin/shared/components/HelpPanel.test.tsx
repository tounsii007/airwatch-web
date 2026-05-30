// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { HelpPanel } from './HelpPanel';

const STORAGE_KEY = 'airwatch.admin.help.open';

function storedOpenMap(): Record<string, boolean> {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
}

// The content body only mounts when expanded; "# Section" parses to an <h3>,
// which is a convenient open/closed probe.
const MD = '# Section\n\nbody copy';

describe('<HelpPanel />', () => {
  it('is collapsed by default — toggle present, body absent', () => {
    render(<HelpPanel pageId="audit" markdown={MD} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Section' }),
    ).not.toBeInTheDocument();
  });

  it('renders the body after hydration when defaultOpen is set', () => {
    render(<HelpPanel pageId="audit" markdown={MD} defaultOpen />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('heading', { level: 3, name: 'Section' }),
    ).toBeInTheDocument();
  });

  it('defaults the heading to "Runbook" and accepts a custom title', () => {
    const { unmount } = render(<HelpPanel pageId="a" markdown={MD} />);
    expect(screen.getByRole('button')).toHaveTextContent('Runbook');
    unmount();

    render(<HelpPanel pageId="a" markdown={MD} title="Audit help" />);
    expect(screen.getByRole('button')).toHaveTextContent('Audit help');
  });

  it('wires aria-controls to the body container id', () => {
    render(<HelpPanel pageId="ports" markdown={MD} defaultOpen />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-controls', 'help-ports');
    expect(document.getElementById('help-ports')).toBeInTheDocument();
  });

  it('opens on click and persists the preference per pageId', async () => {
    const user = userEvent.setup();
    render(<HelpPanel pageId="audit" markdown={MD} />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('heading', { level: 3, name: 'Section' }),
    ).toBeInTheDocument();
    expect(storedOpenMap()).toEqual({ audit: true });
  });

  it('persists the collapsed state when toggled shut again', async () => {
    const user = userEvent.setup();
    render(<HelpPanel pageId="audit" markdown={MD} defaultOpen />);

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    expect(storedOpenMap()).toEqual({ audit: false });
  });

  it('hydrates an open state stored from a previous visit', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ audit: true }));
    render(<HelpPanel pageId="audit" markdown={MD} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('lets a stored false override defaultOpen=true', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ audit: false }));
    render(<HelpPanel pageId="audit" markdown={MD} defaultOpen />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the stored preference isolated per pageId', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ audit: true }));
    // A different page has no stored entry → falls back to its own default.
    render(<HelpPanel pageId="ports" markdown={MD} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('writes alongside other pages without clobbering them', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ports: true }));
    render(<HelpPanel pageId="audit" markdown={MD} />);

    await user.click(screen.getByRole('button'));
    expect(storedOpenMap()).toEqual({ ports: true, audit: true });
  });

  it('falls back to the default when stored JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json');
    render(<HelpPanel pageId="audit" markdown={MD} defaultOpen />);
    // Corrupt storage is swallowed; the defaultOpen prop still wins.
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('has no axe violations when expanded', async () => {
    const { container } = render(
      <HelpPanel pageId="audit" markdown={MD} defaultOpen />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
