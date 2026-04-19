'use client';

import { ReactNode } from 'react';

/** Toggle switch (on/off) for boolean settings. */
export function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: (v: boolean) => void }) {
  const track = enabled ? 'bg-[var(--primary)]' : 'bg-[var(--text-muted)]/30';
  const thumb = enabled ? 'translate-x-5' : 'translate-x-0';
  return (
    <button onClick={() => onToggle(!enabled)} className={`relative w-11 h-6 rounded-full transition-colors ${track}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${thumb}`} />
    </button>
  );
}

/** One labelled setting row with a control on the right. */
export function SettingRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm font-[var(--font-body)] text-[var(--text-primary)]">{label}</span>
      </div>
      {children}
    </div>
  );
}
