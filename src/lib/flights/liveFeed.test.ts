import { describe, expect, it } from 'vitest';
import { resolveWsUrl } from '@/lib/flights/liveFeed';

describe('resolveWsUrl', () => {
  it('converts http → ws', () => {
    expect(resolveWsUrl('http://localhost:8080')).toBe('ws://localhost:8080/ws/flights');
  });

  it('converts https → wss and strips trailing slash', () => {
    expect(resolveWsUrl('https://api.example.com/')).toBe('wss://api.example.com/ws/flights');
  });

  it('returns null without backendUrl on server-side', () => {
    // window is undefined in vitest node env
    expect(resolveWsUrl(undefined)).toBeNull();
  });
});
