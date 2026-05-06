// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  pushBreadcrumb,
  recentBreadcrumbsJson,
  clearBreadcrumbs,
  BREADCRUMB_TAIL_FOR_REPORT,
} from './breadcrumbs';

/**
 * Coverage for the breadcrumb ring buffer + report-tail behaviour. The
 * auto-capture wrapper (installBreadcrumbAutoCapture) installs at module
 * level and rewires history / addEventListener / fetch globally — that's
 * exercised by the e2e suite under a real browser; unit-level we cover
 * the storage primitives that drive it.
 */

describe('pushBreadcrumb / recentBreadcrumbsJson', () => {
  it('stores entries in chronological order', () => {
    pushBreadcrumb('manual', { step: 1 });
    pushBreadcrumb('manual', { step: 2 });
    const raw = recentBreadcrumbsJson();
    expect(raw).toBeTruthy();
    const arr = JSON.parse(raw!);
    expect(arr).toHaveLength(2);
    expect(arr[0].data.step).toBe(1);
    expect(arr[1].data.step).toBe(2);
  });

  it('returns null when no entries', () => {
    expect(recentBreadcrumbsJson()).toBeNull();
  });

  it('caps at the report-tail length even with many entries', () => {
    for (let i = 0; i < 100; i++) {
      pushBreadcrumb('manual', { i });
    }
    const arr = JSON.parse(recentBreadcrumbsJson()!);
    expect(arr).toHaveLength(BREADCRUMB_TAIL_FOR_REPORT);
    expect(arr[0].data.i).toBe(100 - BREADCRUMB_TAIL_FOR_REPORT);
    expect(arr[arr.length - 1].data.i).toBe(99);
  });

  it('survives a parse error in localStorage by starting fresh', () => {
    localStorage.setItem('airwatch.admin.breadcrumbs', '<<not json>>');
    pushBreadcrumb('manual', { x: 1 });
    const raw = recentBreadcrumbsJson();
    expect(raw).toBeTruthy();
    const arr = JSON.parse(raw!);
    expect(arr).toHaveLength(1);
    expect(arr[0].data.x).toBe(1);
  });

  it('records a parseable ISO timestamp', () => {
    pushBreadcrumb('manual', {});
    const arr = JSON.parse(recentBreadcrumbsJson()!);
    expect(() => new Date(arr[0].ts).toISOString()).not.toThrow();
    expect(arr[0].kind).toBe('manual');
  });

  it('preserves the kind field through round-trip', () => {
    const kinds = ['route', 'click', 'fetch:start', 'fetch:response', 'error', 'manual'] as const;
    for (const k of kinds) pushBreadcrumb(k, { tag: k });
    const arr = JSON.parse(recentBreadcrumbsJson()!);
    expect(arr.map((c: { kind: string }) => c.kind)).toEqual([...kinds]);
  });

  it('persists across reads (localStorage round-trip)', () => {
    pushBreadcrumb('manual', { id: 'a' });
    const first = recentBreadcrumbsJson();
    pushBreadcrumb('manual', { id: 'b' });
    const second = recentBreadcrumbsJson();
    expect(first).not.toEqual(second);
    const arr = JSON.parse(second!);
    expect(arr).toHaveLength(2);
  });
});

describe('clearBreadcrumbs()', () => {
  it('drops the entire ring', () => {
    pushBreadcrumb('manual', { x: 1 });
    expect(recentBreadcrumbsJson()).not.toBeNull();
    clearBreadcrumbs();
    expect(recentBreadcrumbsJson()).toBeNull();
  });
});
