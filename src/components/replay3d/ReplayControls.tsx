'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { formatElapsed } from '@/components/replay3d/formatClock';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

const SPEED_OPTIONS = [1, 10, 60, 300] as const;
type SpeedOption = typeof SPEED_OPTIONS[number];

interface Props {
  playing: boolean;
  speed: SpeedOption;
  currentTimeMs: number;
  durationMs: number;
  atEnd: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSpeedChange: (s: SpeedOption) => void;
  onSeek: (tMs: number) => void;
}

function Scrubber({ current, duration, onSeek, label }: { current: number; duration: number; onSeek: (t: number) => void; label: string }) {
  return (
    <input
      type="range"
      min={0}
      max={duration}
      step={Math.max(100, Math.round(duration / 500))}
      value={Math.min(current, duration)}
      onChange={(e) => onSeek(Number(e.target.value))}
      className="flex-1 accent-[var(--primary)] cursor-pointer"
      aria-label={label}
    />
  );
}

function SpeedChip({ value, active, onClick }: { value: SpeedOption; active: boolean; onClick: () => void }) {
  const cls = active
    ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
    : 'text-[var(--text-muted)] border border-transparent hover:text-[var(--text-secondary)]';
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-[9px] font-[var(--font-heading)] font-bold tracking-wider cursor-pointer ${cls}`}
    >
      {value}×
    </button>
  );
}

function PrimaryButton({ Icon, label, onClick }: { Icon: typeof Play; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="w-10 h-10 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-[0_0_10px_var(--primary)] cursor-pointer hover:opacity-90">
      <Icon size={16} />
    </button>
  );
}

/** Bottom-overlay transport controls: play/pause, restart, speed chips, scrubber. */
export function ReplayControls({ playing, speed, currentTimeMs, durationMs, atEnd, onTogglePlay, onRestart, onSpeedChange, onSeek }: Props) {
  const language = useSettingsStore((s) => s.language);
  // Primary-button label flips with playback state — pick the right
  // localised verb so screen readers announce the current action.
  const primaryLabel = atEnd
    ? t('replay_restart', language)
    : playing
      ? t('replay_pause', language)
      : t('replay_play', language);

  return (
    <div className="absolute bottom-4 left-4 right-4 glass-panel rounded-2xl p-3 flex items-center gap-3 pointer-events-auto">
      <PrimaryButton
        Icon={atEnd ? RotateCcw : playing ? Pause : Play}
        label={primaryLabel}
        onClick={atEnd ? onRestart : onTogglePlay}
      />
      <div className="flex-1 flex items-center gap-2">
        <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tabular-nums min-w-[36px]">
          {formatElapsed(currentTimeMs)}
        </span>
        <Scrubber
          current={currentTimeMs}
          duration={durationMs}
          onSeek={onSeek}
          label={t('aria_replay_position', language)}
        />
        <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tabular-nums min-w-[36px] text-right">
          {formatElapsed(durationMs)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {SPEED_OPTIONS.map((s) => (
          <SpeedChip key={s} value={s} active={s === speed} onClick={() => onSpeedChange(s)} />
        ))}
      </div>
    </div>
  );
}

export type { SpeedOption };
export { SPEED_OPTIONS };
