'use client';

import * as React from 'react';

/**
 * Lightweight tabs primitive — controlled or uncontrolled.
 *
 * Usage:
 *   <Tabs defaultValue="cpu">
 *     <TabsList>
 *       <TabsTrigger value="cpu">CPU</TabsTrigger>
 *       <TabsTrigger value="heap">Heap</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="cpu">…</TabsContent>
 *     <TabsContent value="heap">…</TabsContent>
 *   </Tabs>
 *
 * No Radix dep — keyboard nav handled with a custom keydown handler
 * (←/→ moves between triggers, Home/End jumps to first/last).
 */

interface TabsContextValue {
  value: string;
  setValue: (v: string) => void;
}
const TabsContext = React.createContext<TabsContextValue | null>(null);

function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

interface TabsProps {
  defaultValue: string;
  value?: string;                 // controlled
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ defaultValue, value, onValueChange, className, children }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value! : internal;
  const setCurrent = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <TabsContext.Provider value={{ value: current, setValue: setCurrent }}>
      <div className={cn('flex flex-col gap-3', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!ctx) return;
    const triggers = Array.from(
      e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-tabs-trigger]'),
    );
    const idx = triggers.findIndex((t) => t.dataset.value === ctx.value);
    if (idx === -1) return;
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % triggers.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + triggers.length) % triggers.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = triggers.length - 1;
    else return;
    e.preventDefault();
    triggers[next].focus();
    ctx.setValue(triggers[next].dataset.value!);
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex p-1 gap-1 rounded-md bg-surface border border-border',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TabTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}
export function TabsTrigger({ value, className, children, ...props }: TabTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      data-tabs-trigger
      data-value={value}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'px-3 py-1 rounded font-[var(--font-heading)] text-[0.7rem] tracking-[0.1em] uppercase',
        'transition-colors',
        active
          ? 'text-primary-bright bg-[color-mix(in_srgb,var(--color-primary-bright)_12%,transparent)]'
          : 'text-text-muted hover:text-text-primary hover:bg-[rgba(122,154,191,0.10)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
