// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';

const register = vi.fn(() => Promise.resolve());

function setReadyState(state: DocumentReadyState) {
  Object.defineProperty(document, 'readyState', { configurable: true, value: state });
}
function withServiceWorker() {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
}

beforeEach(() => {
  register.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  delete (document as unknown as Record<string, unknown>).readyState; // restore prototype getter
});

describe('<ServiceWorkerRegistrar />', () => {
  it('does not register outside a production build', () => {
    vi.stubEnv('NODE_ENV', 'development');
    withServiceWorker();
    setReadyState('complete');
    render(<ServiceWorkerRegistrar />);
    expect(register).not.toHaveBeenCalled();
  });

  it('registers the worker immediately when the document is already loaded', () => {
    vi.stubEnv('NODE_ENV', 'production');
    withServiceWorker();
    setReadyState('complete');
    render(<ServiceWorkerRegistrar />);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('defers registration until the window load event while still loading', () => {
    vi.stubEnv('NODE_ENV', 'production');
    withServiceWorker();
    setReadyState('loading');
    render(<ServiceWorkerRegistrar />);
    expect(register).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('no-ops without throwing when serviceWorker is unsupported', () => {
    vi.stubEnv('NODE_ENV', 'production');
    setReadyState('complete'); // no navigator.serviceWorker defined
    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    expect(register).not.toHaveBeenCalled();
  });

  it('renders nothing', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { container } = render(<ServiceWorkerRegistrar />);
    expect(container).toBeEmptyDOMElement();
  });
});
