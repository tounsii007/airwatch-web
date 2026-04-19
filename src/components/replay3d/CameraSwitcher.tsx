'use client';

import { CAMERA_MODE_META, type CameraMode } from '@/components/replay3d/cameraModes';

interface Props {
  mode: CameraMode;
  onChange: (next: CameraMode) => void;
}

/** Top-right pill switcher for camera modes. */
export function CameraSwitcher({ mode, onChange }: Props) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-1 glass-panel rounded-full p-1 pointer-events-auto">
      {CAMERA_MODE_META.map(({ mode: m, label }) => {
        const active = m === mode;
        const cls = active
          ? 'bg-[var(--primary)] text-[var(--bg)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]';
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={`px-3 py-1 rounded-full text-[9px] font-[var(--font-heading)] font-bold tracking-widest transition-colors cursor-pointer ${cls}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
