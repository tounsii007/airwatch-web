// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AtcAudioPanel } from './AtcAudioPanel';

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch;
}

function mockFetchReject() {
  globalThis.fetch = vi.fn(async () => { throw new Error('boom'); }) as unknown as typeof fetch;
}

const SAMPLE = {
  icao: 'EDDF',
  count: 2,
  feeds: [
    {
      kind: 'TOWER', label: 'Frankfurt Tower', mount: 'EDDF_TWR',
      streamUrl: 'https://d.liveatc.net/eddf_twr',
      externalUrl: 'https://www.liveatc.net/hlisten.php?mount=EDDF_TWR&icao=EDDF',
    },
    {
      kind: 'APPROACH', label: 'Frankfurt Approach', mount: 'EDDF_APP',
      streamUrl: 'https://d.liveatc.net/eddf_app',
      externalUrl: 'https://www.liveatc.net/hlisten.php?mount=EDDF_APP&icao=EDDF',
    },
  ],
  attribution: 'Audio courtesy of LiveATC.net',
};

describe('<AtcAudioPanel />', () => {
  beforeEach(() => mockFetch({ icao: 'EDDF', count: 0, feeds: [], attribution: 'x' }));
  afterEach(() => { vi.restoreAllMocks(); });

  it('renders nothing when icao is null', () => {
    const { container } = render(<AtcAudioPanel icao={null} language="en" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the no-feeds fallback + LiveATC link when count is 0', async () => {
    mockFetch({ icao: 'ZZZZ', count: 0, feeds: [], attribution: 'x' });
    render(<AtcAudioPanel icao="ZZZZ" language="en" />);
    await waitFor(() => screen.getByText(/No live ATC feed catalogued/i));
    // The deeplink is present even on the "no feeds" branch.
    const link = screen.getByRole('link', { name: /LiveATC.net/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('icao=ZZZZ'));
  });

  it('shows the no-feeds fallback on a fetch error', async () => {
    mockFetchReject();
    render(<AtcAudioPanel icao="EDDF" language="en" />);
    await waitFor(() => screen.getByText(/No live ATC feed catalogued/i));
  });

  it('renders an audio element pointed at the Tower feed by default', async () => {
    mockFetch(SAMPLE);
    const { container } = render(<AtcAudioPanel icao="EDDF" language="en" />);
    await waitFor(() => screen.getByLabelText(/Frankfurt Tower live audio/i));
    const audio = container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute('src')).toContain('eddf_twr');
  });

  it('switches the active feed when a chip is clicked', async () => {
    mockFetch(SAMPLE);
    const { container } = render(<AtcAudioPanel icao="EDDF" language="en" />);
    await waitFor(() => screen.getByText('Frankfurt Tower'));

    fireEvent.click(screen.getByText('Frankfurt Approach'));

    // After click the audio key changes → src points at the approach feed.
    await waitFor(() => {
      const audio = container.querySelector('audio');
      expect(audio?.getAttribute('src')).toContain('eddf_app');
    });
  });

  it('falls back to the first feed if no Tower is present', async () => {
    mockFetch({
      icao: 'EDDF', count: 1, attribution: 'x',
      feeds: [{
        kind: 'GROUND', label: 'Frankfurt Ground', mount: 'EDDF_GND',
        streamUrl: 'https://d.liveatc.net/eddf_gnd',
        externalUrl: 'https://www.liveatc.net/hlisten.php?mount=EDDF_GND&icao=EDDF',
      }],
    });
    const { container } = render(<AtcAudioPanel icao="EDDF" language="en" />);
    await waitFor(() => screen.getByLabelText(/Frankfurt Ground live audio/i));
    const audio = container.querySelector('audio');
    expect(audio?.getAttribute('src')).toContain('eddf_gnd');
  });

  it('hides the chip picker when only one feed is available', async () => {
    mockFetch({
      icao: 'EDDF', count: 1, attribution: 'x',
      feeds: [{
        kind: 'TOWER', label: 'Frankfurt Tower', mount: 'EDDF_TWR',
        streamUrl: 'https://d.liveatc.net/eddf_twr',
        externalUrl: 'https://example/external',
      }],
    });
    render(<AtcAudioPanel icao="EDDF" language="en" />);
    await waitFor(() => screen.getByLabelText(/Frankfurt Tower live audio/i));
    // No clickable Tower chip — only the audio + attribution + link.
    expect(screen.queryByRole('button', { name: /Frankfurt Tower/i })).toBeNull();
  });

  it('drops the external link when the feed URL is not http(s) (XSS guard)', async () => {
    // Split literal so the no-script-url lint rule doesn't flag the fixture.
    const unsafeUrl = 'java' + 'script:alert(document.cookie)';
    mockFetch({
      icao: 'EDDF', count: 1, attribution: 'x',
      feeds: [{
        kind: 'TOWER', label: 'Frankfurt Tower', mount: 'EDDF_TWR',
        streamUrl: 'https://d.liveatc.net/eddf_twr', externalUrl: unsafeUrl,
      }],
    });
    render(<AtcAudioPanel icao="EDDF" language="en" />);
    await waitFor(() => screen.getByLabelText(/Frankfurt Tower live audio/i));
    expect(screen.queryByRole('link', { name: /LiveATC.net/i })).toBeNull();
  });

  it('keeps the external link for a valid https feed URL', async () => {
    mockFetch({
      icao: 'EDDF', count: 1, attribution: 'x',
      feeds: [{
        kind: 'TOWER', label: 'Frankfurt Tower', mount: 'EDDF_TWR',
        streamUrl: 'https://d.liveatc.net/eddf_twr',
        externalUrl: 'https://www.liveatc.net/hlisten.php?mount=EDDF_TWR',
      }],
    });
    render(<AtcAudioPanel icao="EDDF" language="en" />);
    await waitFor(() => screen.getByLabelText(/Frankfurt Tower live audio/i));
    expect(screen.getByRole('link', { name: /LiveATC.net/i }))
      .toHaveAttribute('href', 'https://www.liveatc.net/hlisten.php?mount=EDDF_TWR');
  });
});
