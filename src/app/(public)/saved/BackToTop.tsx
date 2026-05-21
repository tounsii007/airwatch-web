'use client';

import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Small pill button at the bottom of a saved list: scrolls back to top. */
export function BackToTop() {
  return (
    <div className="flex justify-center pt-2">
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={<ChevronUp size={12} />}
        onClick={scrollToTop}
      >
        TOP
      </Button>
    </div>
  );
}
