'use client';

import { ChevronUp } from 'lucide-react';

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Small pill button at the bottom of a saved list: scrolls back to top. */
export function BackToTop() {
  return (
    <div className="flex justify-center pt-2">
      <button
        onClick={scrollToTop}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer"
      >
        <ChevronUp size={12} /> TOP
      </button>
    </div>
  );
}
