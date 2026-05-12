'use client';

import { Plane, Building2, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ManagedImage } from '@/components/common/ManagedImage';
import { OfflineBadge } from '@/components/common/OfflineBadge';
import type { AircraftState } from '@/lib/types';

interface ResultTileProps {
  type: 'flight' | 'airline' | 'airport';
  title: string;
  subtitle?: string;
  status?: string;
  query: string;
  onClick: () => void;
  logoUrl?: string;
  /** Optional — when passed, a small "OFFLINE Xm" pill shows for cached flights. */
  aircraft?: AircraftState;
}

/**
 * Highlight matching portions of text by wrapping them in a styled span.
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) {
    return <>{text}</>;
  }

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="text-[var(--primary)] font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function ResultTile({ type, title, subtitle, status, query, onClick, logoUrl, aircraft }: ResultTileProps) {
  const Icon = type === 'flight' ? Plane : type === 'airport' ? MapPin : Building2;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left"
    >
      {logoUrl ? (
        <div className="relative w-11 h-11 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden p-1">
          <ManagedImage
            src={logoUrl}
            alt=""
            fill
            sizes="44px"
            unoptimized
            className="object-contain p-1"
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <Icon size={18} className="text-[var(--primary)]" />
              </div>
            }
          />
        </div>
      ) : (
        <div className="w-11 h-11 rounded-lg bg-[var(--surface-light)] flex items-center justify-center shrink-0">
          <Icon size={18} className="text-[var(--primary)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-[var(--font-heading)] text-xs font-bold tracking-wider text-[var(--text-primary)] truncate">
          <HighlightedText text={title} query={query} />
        </p>
        {subtitle && (
          <p className="text-[var(--text-muted)] text-[11px] font-[var(--font-body)] truncate mt-0.5">
            <HighlightedText text={subtitle} query={query} />
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {aircraft && <OfflineBadge aircraft={aircraft} />}
        {status && <StatusBadge status={status} />}
      </div>
    </button>
  );
}
