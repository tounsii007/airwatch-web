'use client';

/**
 * Lightweight tab bar with an underlined active indicator. Companion to
 * SegmentedControl — use Tabs when each option also represents a
 * deeper view (e.g. /flight/detail has tabs for Route / Aircraft /
 * Schedule), whereas SegmentedControl is for inline mode-switches.
 *
 *   <Tabs
 *     value={tab}
 *     onChange={setTab}
 *     tabs={[
 *       { value: 'route', label: 'Route' },
 *       { value: 'aircraft', label: 'Aircraft', count: 1 },
 *       { value: 'sched', label: 'Schedule' },
 *     ]}
 *   />
 *
 * The indicator measures its width + offset against the active tab via
 * a layout effect, then transitions transform/width simultaneously
 * for a smooth slide.
 */

import { type ReactNode, useId, useLayoutEffect, useRef, useState } from 'react';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional count badge rendered after the label (e.g. unread count). */
  count?: number;
  /** When true, renders the tab dimmed and clicks are no-ops. */
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  tabs: readonly TabItem<T>[];
  className?: string;
  ariaLabel?: string;
  /** When true, the underlying bar stretches to fill the parent and
   *  each tab shares equal width. */
  fullWidth?: boolean;
}

interface IndicatorState {
  x: number;
  w: number;
  ready: boolean;
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className = '',
  ariaLabel,
  fullWidth = false,
}: TabsProps<T>) {
  const groupId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<IndicatorState>({ x: 0, w: 0, ready: false });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const active = container.querySelector<HTMLButtonElement>('[data-active="true"]');
      if (!active) {
        setIndicator((prev) => ({ ...prev, ready: false }));
        return;
      }
      const c = container.getBoundingClientRect();
      const a = active.getBoundingClientRect();
      setIndicator({ x: a.left - c.left, w: a.width, ready: true });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener('resize', measure);
    const id = window.requestAnimationFrame(measure);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.cancelAnimationFrame(id);
    };
  }, [value, tabs]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex items-center gap-1 border-b border-[var(--glass-border)] ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            id={`${groupId}-${tab.value}`}
            role="tab"
            aria-selected={isActive}
            data-active={isActive || undefined}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            className={`relative inline-flex items-center gap-1.5 px-3 py-2 font-[var(--font-heading)] font-bold tracking-wider uppercase text-[0.75rem] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'text-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            } ${fullWidth ? 'flex-1 justify-center' : ''}`}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full px-1 t-meta tabular ${
                  isActive
                    ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
                    : 'bg-white/5 text-[var(--text-muted)] border border-[var(--glass-border)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}

      {/* Active-tab underline indicator. Animates left + width
          simultaneously for a smooth slide. */}
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-[2px] rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)] transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.5,1)]"
        style={{
          transform: `translateX(${indicator.x}px)`,
          width: indicator.w,
          opacity: indicator.ready ? 1 : 0,
        }}
      />
    </div>
  );
}
