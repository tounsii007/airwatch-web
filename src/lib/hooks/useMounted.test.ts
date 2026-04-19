// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMounted } from '@/lib/hooks/useMounted';

describe('useMounted (happy-dom)', () => {
  it('returns true after mount on the client', () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });
});
