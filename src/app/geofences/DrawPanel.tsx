'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import type { GeoFenceDraft } from '@/components/geofence/GeoFenceDrawMap';
import type { GeoFence } from '@/lib/flights/geofence';

// Leaflet + leaflet-draw both depend on `window` — must be client-side only.
const GeoFenceDrawMap = dynamic(
  () => import('@/components/geofence/GeoFenceDrawMap').then((m) => m.GeoFenceDrawMap),
  { ssr: false },
);

interface Props {
  draft: GeoFenceDraft | null;
  existing: GeoFence[];
  onDraft: (d: GeoFenceDraft) => void;
}

function circleCaption(d: GeoFenceDraft): string {
  return `circle @ ${d.centerLat?.toFixed(3)}, ${d.centerLon?.toFixed(3)} · r=${d.radiusKm}km`;
}

function rectangleCaption(d: GeoFenceDraft): string {
  return `rectangle N${d.northLat?.toFixed(2)}/S${d.southLat?.toFixed(2)} E${d.eastLon?.toFixed(2)}/W${d.westLon?.toFixed(2)}`;
}

function DraftCaption({ draft }: { draft: GeoFenceDraft }) {
  const caption = draft.type === 'CIRCLE' ? circleCaption(draft) : rectangleCaption(draft);
  return (
    <p className="mt-2 text-[10px] text-[var(--text-muted)]">
      Drafted {caption}. Fill in the name below and submit.
    </p>
  );
}

/** Client-only draw-on-map panel for sketching circle / rectangle fences. */
export function DrawPanel({ draft, existing, onDraft }: Props) {
  return (
    <GlassPanel className="mb-6 p-4">
      <h2 className="text-xs font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)] mb-3 flex items-center gap-2">
        <MapPin size={14} /> DRAW ON MAP
      </h2>
      <GeoFenceDrawMap onDraft={onDraft} existing={existing} />
      {draft && <DraftCaption draft={draft} />}
    </GlassPanel>
  );
}
