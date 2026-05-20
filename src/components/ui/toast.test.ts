import { afterEach, describe, expect, it } from 'vitest';
import { toast, useToastStore } from '@/components/ui/toast';

describe('toast store', () => {
  afterEach(() => {
    useToastStore.getState().dismissAll();
  });

  it('pushes a default toast from a plain string', () => {
    toast('Hi');
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].title).toBe('Hi');
    expect(toasts[0].variant).toBe('default');
  });

  it('exposes variant helpers', () => {
    toast.success('Saved');
    toast.error({ title: 'Boom', body: 'oh no' });
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    expect(toasts[0].variant).toBe('success');
    expect(toasts[1].variant).toBe('error');
    expect(toasts[1].body).toBe('oh no');
  });

  it('returns an id that can dismiss the specific toast', () => {
    const id1 = toast('A');
    const id2 = toast('B');
    expect(useToastStore.getState().toasts).toHaveLength(2);
    toast.dismiss(id1);
    const remaining = useToastStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(id2);
  });

  it('dismissAll clears the queue', () => {
    toast('A');
    toast('B');
    toast.dismissAll();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('honours custom variant + duration from object form', () => {
    toast({ title: 'X', variant: 'warning', duration: 12000 });
    const t = useToastStore.getState().toasts[0];
    expect(t.variant).toBe('warning');
    expect(t.duration).toBe(12000);
  });

  it('defaults the duration to 4 seconds', () => {
    toast('Hi');
    expect(useToastStore.getState().toasts[0].duration).toBe(4000);
  });
});
