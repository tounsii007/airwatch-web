// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MapBrandOverlay } from './MapBrandOverlay';

describe('<MapBrandOverlay />', () => {
  it('always renders the brand wordmark', () => {
    render(<MapBrandOverlay transport="polling" />);
    expect(screen.getByText('AIRWATCH')).toBeInTheDocument();
  });

  it('tags a websocket transport as LIVE · WS with a descriptive title', () => {
    const { container } = render(<MapBrandOverlay transport="websocket" />);
    expect(screen.getByText('LIVE · WS')).toBeInTheDocument();
    expect(container.querySelector('[title="WebSocket push"]')).not.toBeNull();
  });

  it('tags a polling transport as plain LIVE with the polling title', () => {
    const { container } = render(<MapBrandOverlay transport="polling" />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(container.querySelector('[title="HTTP polling"]')).not.toBeNull();
  });

  it('shows a plain LIVE pill and an empty title for an unknown transport', () => {
    const { container } = render(<MapBrandOverlay transport={null} />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(container.querySelector('[title="WebSocket push"]')).toBeNull();
    expect(container.querySelector('[title="HTTP polling"]')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { container } = render(<MapBrandOverlay transport="websocket" />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
