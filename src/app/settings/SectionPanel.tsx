'use client';

import { ReactNode } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface Props {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

/** Reusable settings section with a header row + icon + content. */
export function SectionPanel({ icon, title, children }: Props) {
  return (
    <GlassPanel className="p-4">
      <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {children}
    </GlassPanel>
  );
}

/** Labelled block with a small caption above the control row. */
export function LabeledBlock({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="py-2">
      <span className="text-xs text-[var(--text-secondary)] font-[var(--font-body)] mb-2 flex items-center gap-1.5">
        {label}
      </span>
      {children}
    </div>
  );
}
