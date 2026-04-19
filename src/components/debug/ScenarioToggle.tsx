'use client';

import type { MockScenario } from '@/lib/flights/mockAircraft';

interface Props {
  scenario: MockScenario;
  active: boolean;
  onToggle: () => void;
}

const COLOR_CLASSES: Record<MockScenario['color'], string> = {
  error:   'bg-[var(--error)]/15 text-[var(--error)] border-[var(--error)]/30',
  warning: 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30',
  success: 'bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30',
  primary: 'bg-[var(--primary)]/15 text-[var(--primary)] border-[var(--primary)]/30',
  accent:  'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30',
  info:    'bg-[var(--info)]/15 text-[var(--info)] border-[var(--info)]/30',
};

const DOT_VAR: Record<MockScenario['color'], string> = {
  error: '--error', warning: '--warning', success: '--success',
  primary: '--primary', accent: '--accent', info: '--info',
};

function Dot({ active, color }: { active: boolean; color: MockScenario['color'] }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full shrink-0 ${active ? 'animate-pulse-glow' : ''}`}
      style={{ backgroundColor: active ? `var(${DOT_VAR[color]})` : 'var(--text-muted)' }}
    />
  );
}

/** One row in the dev-tools panel — toggles a single mock scenario on/off. */
export function ScenarioToggle({ scenario, active, onToggle }: Props) {
  const activeCls = active
    ? COLOR_CLASSES[scenario.color] + ' border'
    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--glass-border)]';

  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${activeCls}`}
    >
      <span className="text-sm leading-tight shrink-0" aria-hidden>{scenario.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] font-[var(--font-heading)] font-bold tracking-wider">
          {scenario.label}
        </span>
        <span className="block text-[9px] font-[var(--font-body)] text-[var(--text-muted)] mt-0.5 leading-snug">
          {scenario.description}
        </span>
      </span>
      <Dot active={active} color={scenario.color} />
    </button>
  );
}
