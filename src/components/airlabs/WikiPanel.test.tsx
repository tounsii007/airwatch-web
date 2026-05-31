// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import type { Wiki } from '@/lib/airlabs/schemas';
import { WikiPanel } from './WikiPanel';

// The panel fires one Airlabs fetch on mount; drive its result per-test.
const fetchOne = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('@/lib/airlabs/fetch', () => ({
  fetchAirlabsOne: (...args: unknown[]) => fetchOne.fn(...args),
}));

// settingsStore is destructured ({ language }) here, not selector-called.
const settings = vi.hoisted(() => ({ language: 'en' }));
vi.mock('@/lib/stores/settingsStore', () => ({ useSettingsStore: () => settings }));

// i18n passthrough — assert on raw keys.
vi.mock('@/lib/i18n/translations', () => ({ t: (key: string) => key }));

const wiki = (over: Partial<Wiki> = {}): Wiki => ({
  summary: 'Lufthansa is the flag carrier of Germany.',
  wiki_url: 'https://en.wikipedia.org/wiki/Lufthansa',
  image_url: 'https://upload.wikimedia.org/lh.png',
  image_attribution: 'CC-BY',
  ...over,
});

const ok = (item: Wiki) => fetchOne.fn.mockResolvedValue({ ok: true, item });
const fail = () => fetchOne.fn.mockResolvedValue({ ok: false, error: { kind: 'http', status: 429 } });

/** Flush the mount effect's awaited fetch + the setState that follows. */
async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  settings.language = 'en';
  fetchOne.fn.mockReset();
});
afterEach(() => cleanup());

describe('<WikiPanel />', () => {
  it('never fetches when neither iata prop is supplied', async () => {
    const { container } = render(<WikiPanel />);
    await settle();
    expect(fetchOne.fn).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the heading and summary on a successful fetch', async () => {
    ok(wiki());
    render(<WikiPanel airlineIata="LH" />);
    expect(await screen.findByText('about')).toBeInTheDocument();
    expect(screen.getByText(/flag carrier of Germany/)).toBeInTheDocument();
  });

  it('passes the upper-cased airline iata through to the wiki endpoint', async () => {
    ok(wiki());
    render(<WikiPanel airlineIata="lh" />);
    await waitFor(() => expect(fetchOne.fn).toHaveBeenCalledTimes(1));
    expect(String(fetchOne.fn.mock.calls[0][0])).toContain('airline_iata=LH');
  });

  // The lead image is decorative (alt=""), so it carries no `img` ARIA role —
  // query the element directly rather than via getByRole.
  it('renders the lead image when image_url is present', async () => {
    ok(wiki({ image_url: 'https://img.example/x.png' }));
    const { container } = render(<WikiPanel airportIata="FRA" />);
    await screen.findByText('about');
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://img.example/x.png');
  });

  it('omits the image when image_url is absent', async () => {
    ok(wiki({ image_url: null }));
    const { container } = render(<WikiPanel airportIata="FRA" />);
    await screen.findByText('about');
    expect(container.querySelector('img')).toBeNull();
  });

  it('drops a non-http(s) image_url via the scheme guard but keeps the summary', async () => {
    // Split literal so the no-script-url lint rule doesn't flag the fixture.
    ok(wiki({ image_url: 'java' + 'script:alert(1)' }));
    const { container } = render(<WikiPanel airlineIata="LH" />);
    await screen.findByText('about');
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(/flag carrier of Germany/)).toBeInTheDocument();
  });

  it('hides the broken image without dropping the summary on load error', async () => {
    ok(wiki());
    const { container } = render(<WikiPanel airlineIata="LH" />);
    await screen.findByText('about');
    const img = container.querySelector('img') as HTMLImageElement;
    act(() => { img.dispatchEvent(new Event('error')); });
    expect(img.style.display).toBe('none');
    expect(screen.getByText(/flag carrier of Germany/)).toBeInTheDocument();
  });

  it('links out to Wikipedia behind a safe-url guard', async () => {
    ok(wiki({ wiki_url: 'https://en.wikipedia.org/wiki/Lufthansa' }));
    render(<WikiPanel airlineIata="LH" />);
    const link = (await screen.findByRole('link')) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Lufthansa');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link).toHaveTextContent('read_on_wikipedia');
  });

  it('drops the wikipedia link for an unsafe (javascript:) url', async () => {
    ok(wiki({ wiki_url: 'javascript:alert(1)' }));
    render(<WikiPanel airlineIata="LH" />);
    await screen.findByText('about');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('stays hidden when the fetch fails (fail-soft)', async () => {
    fail();
    const { container } = render(<WikiPanel airlineIata="LH" />);
    await waitFor(() => expect(fetchOne.fn).toHaveBeenCalledTimes(1));
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it('stays hidden when upstream returns neither summary nor image', async () => {
    ok(wiki({ summary: null, image_url: null }));
    const { container } = render(<WikiPanel airlineIata="LH" />);
    await waitFor(() => expect(fetchOne.fn).toHaveBeenCalledTimes(1));
    await settle();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an image-only card when the summary is missing', async () => {
    ok(wiki({ summary: null, image_url: 'https://img.example/y.png' }));
    const { container } = render(<WikiPanel airportIata="JFK" />);
    await screen.findByText('about');
    expect(container.querySelector('img')).not.toBeNull();
    expect(screen.queryByText(/flag carrier/)).toBeNull();
  });
});
