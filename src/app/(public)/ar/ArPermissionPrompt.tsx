'use client';

import { Camera, Compass, MapPin, ScanEye } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { NeonText } from '@/components/ui/NeonText';

interface Props {
  busy: boolean;
  error: string | null;
  onStart: () => void;
}

function PermItem({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 text-left">
      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0 text-[var(--primary)]">
        {icon}
      </div>
      <div>
        <div className="text-sm font-[var(--font-body)] font-bold text-[var(--text-primary)]">{title}</div>
        <div className="text-[11px] text-[var(--text-muted)] font-[var(--font-body)]">{detail}</div>
      </div>
    </div>
  );
}

/** First-run screen: explains required permissions before a user-gesture grant. */
export function ArPermissionPrompt({ busy, error, onStart }: Props) {
  return (
    <div className="fixed inset-0 bg-[var(--bg)] flex items-center justify-center p-6 z-40">
      <GlassPanel className="w-full max-w-md p-6 space-y-5 text-center">
        <div className="flex flex-col items-center gap-2">
          <ScanEye size={40} className="text-[var(--primary)] drop-shadow-[0_0_10px_var(--primary)]" />
          <NeonText text="AR SPOTTING" size="text-lg" />
          <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)]">
            Halte dein Gerät zum Himmel — wir blenden Flüge in Echtzeit ein.
          </p>
        </div>

        <div className="space-y-3">
          <PermItem icon={<Camera size={16} />} title="Kamera" detail="Live-Feed als Hintergrund" />
          <PermItem icon={<MapPin size={16} />} title="Standort" detail="Damit wir deinen Horizont berechnen" />
          <PermItem icon={<Compass size={16} />} title="Kompass & Gyroskop" detail="Um Flüge richtig zu platzieren" />
        </div>

        {error && (
          <p className="text-xs text-[var(--error)] font-[var(--font-body)] border border-[var(--error)]/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={onStart}
          disabled={busy}
          className="w-full px-4 py-3 rounded-xl text-sm font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)] text-[var(--bg)] disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
        >
          {busy ? 'WIRD GESTARTET…' : 'AR STARTEN'}
        </button>
      </GlassPanel>
    </div>
  );
}
