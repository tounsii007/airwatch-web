// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DevTools } from './DevTools';

// Stub the heavy panel — this suite only cares about the production gate.
vi.mock('@/components/debug/MockEmergenciesPanel', () => ({
  MockEmergenciesPanel: () => <div data-testid="mock-panel" />,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('<DevTools />', () => {
  it('mounts the dev panel outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(<DevTools />);
    expect(screen.getByTestId('mock-panel')).toBeInTheDocument();
  });

  it('renders nothing in a production build', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { container } = render(<DevTools />);
    expect(screen.queryByTestId('mock-panel')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
});
