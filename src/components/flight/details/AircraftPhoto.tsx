'use client';

import { Maximize2 } from 'lucide-react';
import { ManagedImage } from '@/components/common/ManagedImage';

interface Props {
  photoUrl: string;
  registration?: string;
  /** When set, clicking the photo opens the full gallery modal. */
  onExpand?: () => void;
}

function Overlay({ registration }: { registration?: string }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
      <span className="text-[9px] text-white/70">planespotters.net</span>
      {registration && (
        <span className="float-right text-[9px] text-white/70 font-[var(--font-heading)]">{registration}</span>
      )}
    </div>
  );
}

function ExpandHint() {
  return (
    <div className="absolute top-2 right-2 rounded-full bg-black/50 backdrop-blur-sm p-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
      <Maximize2 size={12} className="text-white" />
    </div>
  );
}

/** Desktop large aircraft photo with credit overlay. Optionally clickable → gallery. */
export function AircraftPhoto({ photoUrl, registration, onExpand }: Props) {
  const interactive = Boolean(onExpand);
  return (
    <div className="p-4">
      <button
        type="button"
        onClick={onExpand}
        disabled={!interactive}
        className={`group relative rounded-xl overflow-hidden w-full block ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <ManagedImage src={photoUrl} alt="" width={368} height={160} unoptimized className="w-full h-40 object-cover" />
        {interactive && <ExpandHint />}
        <Overlay registration={registration} />
      </button>
    </div>
  );
}
