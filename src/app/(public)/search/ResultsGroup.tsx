'use client';

import { ReactNode } from 'react';

interface Props {
  title: string;
  count: number;
  children: ReactNode;
}

/** Titled group wrapper for search results (live flights / airlines). */
export function ResultsGroup({ title, count, children }: Props) {
  if (count === 0) return null;
  return (
    <div>
      <h3 className="text-[var(--text-muted)] text-[9px] font-[var(--font-heading)] tracking-widest mb-2 px-1">
        {title} ({count})
      </h3>
      <div className="glass-panel divide-y divide-[var(--glass-border)]">
        {children}
      </div>
    </div>
  );
}
