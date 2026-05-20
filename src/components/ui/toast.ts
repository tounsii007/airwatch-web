'use client';

/**
 * Zustand-backed toast store. Imperative API: anywhere in the app, call
 * `toast.success("Saved")` and the singleton `<ToastContainer>` mounted
 * in the root layout renders it. Auto-dismisses after `duration` ms;
 * the container also exposes a dismiss button.
 *
 * Why a store instead of context: toasts are fired from event handlers
 * far away from the React tree (Zustand actions, fetch callbacks, even
 * `window` listeners). Reaching for a context provider via a hook isn't
 * available there — a singleton store you can import from any module is.
 *
 *   import { toast } from '@/components/ui';
 *   toast.success('Flight saved');
 *   toast.error('Could not save');
 *   toast({ title: 'Heads up', body: 'Backend is degraded', variant: 'warning', duration: 8000 });
 */

import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export interface ToastEntry {
  id: number;
  title: string;
  body?: string;
  variant: ToastVariant;
  /** ms — when 0, the toast stays until explicitly dismissed. */
  duration: number;
  /** Wall-clock when the toast was pushed; lets the container schedule
   *  its own removal timer. */
  pushedAt: number;
}

interface ToastStore {
  toasts: ToastEntry[];
  push: (entry: Omit<ToastEntry, 'id' | 'pushedAt'>) => number;
  dismiss: (id: number) => void;
  dismissAll: () => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  push: (entry) => {
    const id = nextId++;
    const pushedAt = Date.now();
    set((s) => ({ toasts: [...s.toasts, { ...entry, id, pushedAt }] }));
    return id;
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  dismissAll: () => set({ toasts: [] }),
}));

interface ToastInput {
  title: string;
  body?: string;
  variant?: ToastVariant;
  duration?: number;
}

function pushToast(input: ToastInput | string, variant: ToastVariant = 'default'): number {
  const data: ToastInput = typeof input === 'string' ? { title: input } : input;
  return useToastStore.getState().push({
    title: data.title,
    body: data.body,
    variant: data.variant ?? variant,
    duration: data.duration ?? 4000,
  });
}

/**
 * Imperative entry-point. Call `toast('Hi')` for a default toast or one
 * of the variant helpers for sign-tinted messages.
 */
export const toast = Object.assign(
  (input: ToastInput | string) => pushToast(input, 'default'),
  {
    success: (input: ToastInput | string) => pushToast(input, 'success'),
    warning: (input: ToastInput | string) => pushToast(input, 'warning'),
    error:   (input: ToastInput | string) => pushToast(input, 'error'),
    info:    (input: ToastInput | string) => pushToast(input, 'info'),
    dismiss: (id: number) => useToastStore.getState().dismiss(id),
    dismissAll: () => useToastStore.getState().dismissAll(),
  },
);
