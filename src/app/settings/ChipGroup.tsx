'use client';

import { ReactNode } from 'react';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface Props<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}

const ACTIVE = 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30';
const INACTIVE = 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent';

function Chip<T extends string>({ option, active, onClick }: { option: ChipOption<T>; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider transition-all ${active ? ACTIVE : INACTIVE}`}
    >
      {option.icon}
      {option.label}
    </button>
  );
}

/** Horizontal chip group with exactly one selected value. */
export function ChipGroup<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((opt) => (
        <Chip key={opt.value} option={opt} active={opt.value === value} onClick={() => onChange(opt.value)} />
      ))}
    </div>
  );
}
