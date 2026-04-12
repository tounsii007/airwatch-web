import { describe, expect, it } from 'vitest';
import { resolvePollingIntervalMs } from './polling';

describe('resolvePollingIntervalMs', () => {
  it('respects configured intervals above the floor', () => {
    expect(resolvePollingIntervalMs(300)).toBe(300000);
  });

  it('enforces a 30 second minimum', () => {
    expect(resolvePollingIntervalMs(5)).toBe(30000);
  });
});
