'use client';

import { type ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

interface Props {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

/** Reusable settings section — renders as a Card with an icon+title header. */
export function SectionPanel({ icon, title, children }: Props) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span className="text-[var(--text-muted)]" aria-hidden>{icon}</span>
          {title}
        </span>
      }
      bare
      bodyClassName="px-4 pb-4 pt-2"
    >
      {children}
    </Card>
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
