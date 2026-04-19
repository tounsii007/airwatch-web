'use client';

interface Props {
  pitch: number;
  roll: number | null;
  fovVerticalDeg: number;
  viewportHeight: number;
}

/**
 * Horizon line: slides vertically with device pitch and rotates with roll.
 * When pitch = 0 (camera level) the line sits exactly in the middle.
 */
export function HorizonLine({ pitch, roll, fovVerticalDeg, viewportHeight }: Props) {
  const pxPerDeg = viewportHeight / fovVerticalDeg;
  const offsetY = pitch * pxPerDeg;
  const rollDeg = roll ?? 0;

  return (
    <div
      className="absolute left-0 right-0 top-1/2 h-px pointer-events-none"
      style={{ transform: `translateY(${offsetY}px) rotate(${rollDeg}deg)` }}
    >
      <div className="w-full h-px bg-[var(--primary)]/30 shadow-[0_0_6px_var(--primary)]" />
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-[var(--font-heading)] text-[var(--primary)]/50 tracking-widest">
        HORIZON
      </div>
    </div>
  );
}
