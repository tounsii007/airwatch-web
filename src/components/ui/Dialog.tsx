'use client';

/**
 * Modal dialog primitive. Centred (or bottom-sheet on mobile) panel
 * with a dimmed backdrop, scroll-lock, focus management, and Esc to
 * close. Layout flow:
 *
 *   <Dialog open={open} onClose={close} title="Confirm">
 *     <p>Body copy.</p>
 *     <div className="flex justify-end gap-2 mt-4">
 *       <Button variant="ghost" onClick={close}>Cancel</Button>
 *       <Button variant="danger" onClick={confirm}>Delete</Button>
 *     </div>
 *   </Dialog>
 *
 * Behaviour:
 *   * `role="dialog"` + `aria-modal="true"` + `aria-labelledby` so SR
 *     users hear the title on open.
 *   * Esc closes (when `dismissible !== false`).
 *   * Click-outside on the backdrop closes (when `dismissible !== false`).
 *   * `<body>.overflow` is set to `hidden` while open and restored on
 *     close to prevent the underlying map from scrolling.
 *   * First focusable child receives focus on open; restores focus to
 *     the previously-focused element on close.
 *
 * Why no portal: AirWatch mounts a single root layout, and every
 * dialog we need today lives above z=50. A fixed-position element
 * inside the normal tree is enough; adding a portal pulls in React DOM
 * createPortal scaffolding we don't need yet.
 */

import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Hint shown beneath the title in muted small text. */
  description?: ReactNode;
  children: ReactNode;
  /** When false, the dialog can only be closed programmatically (no
   *  Esc, no backdrop click, no close button). Default true. */
  dismissible?: boolean;
  /** Footer slot — usually a row of action buttons. */
  footer?: ReactNode;
  /** Width preset. */
  size?: 'sm' | 'md' | 'lg';
  /** Override the default presentational class on the inner panel. */
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<DialogProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  dismissible = true,
  footer,
  size = 'md',
  className = '',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);

  // Esc-to-close + focus management + body scroll lock.
  useEffect(() => {
    if (!open) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', onKey);

    // Focus the first focusable element inside the panel. We pick the
    // first non-disabled control; falling back to the panel itself so
    // assistive tech doesn't strand the user outside the dialog.
    requestAnimationFrame(() => {
      const candidates = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const target = candidates?.[0];
      (target ?? panelRef.current)?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={(e) => {
        // Only close on a click that originates on the backdrop itself
        // — clicks on the panel children must not bubble through to
        // dismiss the dialog.
        if (e.target === e.currentTarget) close();
      }}
      className="fixed inset-0 z-[1500] bg-black/55 backdrop-blur-sm animate-fade-in flex items-end lg:items-center justify-center px-3 pb-3 lg:px-4 lg:pb-4 pt-3 lg:pt-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`glass-panel-floating w-full ${SIZE_CLASS[size]} rounded-2xl animate-slide-up lg:animate-scale-in focus:outline-none ${className}`}
      >
        {(title || dismissible) && (
          <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-[var(--glass-border)]">
            <div className="min-w-0 flex-1">
              {title && (
                <h2
                  id={titleId}
                  className="font-[var(--font-heading)] font-bold tracking-wider text-[var(--text-primary)] t-display"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="mt-1 text-sm text-[var(--text-secondary)]">
                  {description}
                </p>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="shrink-0 -mr-1 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 active:scale-95 transition-all"
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </header>
        )}

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>

        {footer && (
          <footer className="px-5 py-3 border-t border-[var(--glass-border)] flex items-center justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
