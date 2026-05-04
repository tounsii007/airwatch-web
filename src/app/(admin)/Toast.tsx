'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Light-weight toast/snackbar system for the admin shell.
 *
 * Mounted once per layout (see {@link ToastViewport}); any client
 * component grabs {@link useToast} and pushes a notification:
 *
 *     const toast = useToast();
 *     toast.success('Password changed');
 *     toast.error('CSRF token expired — re-login');
 *
 * Toasts auto-dismiss after {@link DEFAULT_DURATION_MS} unless their
 * `duration` is overridden (0 = sticky until dismissed).
 *
 * Why not a library: pulling react-hot-toast / sonner adds another
 * dep + another set of theme tokens to align. This is ~80 lines of
 * code with full keyboard/aria support and matches the admin theme
 * tokens directly.
 */

const DEFAULT_DURATION_MS = 4_000;

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  /** ms — 0 means stay until manually dismissed. */
  duration: number;
}

interface ToastContextValue {
  push: (tone: ToastTone, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error:   (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info:    (message: string, duration?: number) => void;
  dismiss: (id: number) => void;
  clear:   () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Don't crash: when used outside a provider (e.g. unit tests, or a
    // page that forgot to mount the viewport), return a no-op so the
    // calling component doesn't blow up — silent UX failure is better
    // than a broken page.
    return NO_OP_TOAST;
  }
  return ctx;
}

const NO_OP_TOAST: ToastContextValue = {
  push: () => {}, success: () => {}, error: () => {},
  warning: () => {}, info: () => {}, dismiss: () => {}, clear: () => {},
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone: ToastTone, message: string, duration = DEFAULT_DURATION_MS) => {
    const id = nextId++;
    setToasts((cur) => [...cur, { id, tone, message, duration }]);
    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  const value: ToastContextValue = {
    push,
    success: (m, d) => push('success', m, d),
    error:   (m, d) => push('error',   m, d),
    warning: (m, d) => push('warning', m, d),
    info:    (m, d) => push('info',    m, d),
    dismiss,
    clear: () => setToasts([]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const ICON: Record<ToastTone, string> = {
  success: '✓',
  error:   '✗',
  warning: '⚠',
  info:    'ℹ',
};

const COLOR: Record<ToastTone, string> = {
  success: 'var(--success)',
  error:   'var(--error)',
  warning: 'var(--warning)',
  info:    'var(--info)',
};

function ToastViewport({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div
      // ARIA live region: screen readers announce new toasts as they appear.
      // 'polite' avoids interrupting whatever the user is currently reading.
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: 'min(420px, calc(100vw - 2rem))',
        pointerEvents: 'none', // children re-enable so the rest of the page is still clickable
      }}
    >
      {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const color = COLOR[toast.tone];
  // Slide-in animation via CSS-in-JS keyframes — keeps the component
  // self-contained without bloating admin.css.
  const [entered, setEntered] = useState(false);
  useEffect(() => { setEntered(true); }, []);

  return (
    <div
      role="status"
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.7rem 0.9rem',
        background: 'var(--surface)',
        border: `1px solid color-mix(in srgb, ${color} 35%, var(--border))`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
        transform: entered ? 'translateX(0)' : 'translateX(110%)',
        opacity: entered ? 1 : 0,
        transition: 'transform 220ms cubic-bezier(.2,.9,.3,1), opacity 220ms',
      }}
    >
      <span aria-hidden="true" style={{ color, fontSize: '1rem', lineHeight: 1, marginTop: 1 }}>
        {ICON[toast.tone]}
      </span>
      <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '0.8125rem', lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          color: 'var(--text-muted)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0.25rem',
          fontSize: '0.875rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
