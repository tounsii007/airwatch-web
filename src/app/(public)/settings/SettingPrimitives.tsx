'use client';

/**
 * Settings-section helpers. The previous `Toggle` primitive that lived
 * here is gone — every call site now uses the shared `<Switch>` from
 * `@/components/ui/Switch` so we have one source of truth for the
 * on/off control instead of two.
 *
 * What remains: `<SettingRow>`, the labelled row layout used by every
 * boolean / chip control in the settings page.
 */
import { ReactNode } from 'react';

/** One labelled setting row with a control on the right.
 *  Optional `hint` renders a small explanatory line under the label —
 *  useful for the privacy/data toggles where the user wants to know
 *  what they're actually opting in/out of. */
export function SettingRow({
  icon,
  label,
  hint,
  children,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-[var(--font-body)] text-[var(--text-primary)]">{label}</div>
          {hint && (
            <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">{hint}</div>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
