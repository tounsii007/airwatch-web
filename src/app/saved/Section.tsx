'use client';

import { ReactNode } from 'react';

interface Props {
  title: string;
  icon?: ReactNode;
  accent?: 'muted' | 'warning';
  children: ReactNode;
}

const ACCENT = {
  muted: 'text-[var(--text-muted)]',
  warning: 'text-[var(--warning)]',
} as const;

/** Titled grouping wrapper for the saved page. */
export function Section({ title, icon, accent = 'muted', children }: Props) {
  return (
    <div>
      <h3 className={`text-[10px] font-[var(--font-heading)] ${ACCENT[accent]} tracking-widest mb-2 flex items-center gap-1`}>
        {icon}
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
