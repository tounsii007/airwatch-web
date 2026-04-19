'use client';

import { ManagedImage } from '@/components/common/ManagedImage';

interface Props {
  photoUrl: string;
  registration?: string;
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

/** Desktop large aircraft photo with credit overlay. */
export function AircraftPhoto({ photoUrl, registration }: Props) {
  return (
    <div className="p-4">
      <div className="relative rounded-xl overflow-hidden">
        <ManagedImage src={photoUrl} alt="" width={368} height={160} unoptimized className="w-full h-40 object-cover" />
        <Overlay registration={registration} />
      </div>
    </div>
  );
}
