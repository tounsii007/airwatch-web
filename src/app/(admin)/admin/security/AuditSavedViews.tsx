/**
 * Saved-views bar for the Audit table. (Phase 3.4)
 *
 * Bridges {@link useSavedViews} (localStorage) to the audit page's URL
 * params (q, page) so applying a view triggers a normal Next.js
 * navigation — the server re-fetches with the filters and renders the
 * filtered rows. No client-side data shadowing.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useSavedViews, SavedViewsBar } from '@/app/(admin)/admin/shared/components/SavedViews';

interface AuditFilters {
  q: string;
  page: number;
}

export function AuditSavedViews({ currentQuery, currentPage }: { currentQuery: string; currentPage: number }) {
  const router = useRouter();
  const { views, save, remove } = useSavedViews<AuditFilters>('audit');

  const current: AuditFilters = { q: currentQuery, page: currentPage };

  function applyView(f: AuditFilters) {
    const params = new URLSearchParams();
    if (f.q)        params.set('q', f.q);
    if (f.page > 1) params.set('page', String(f.page));
    const qs = params.toString();
    router.push(qs ? `/admin/security?${qs}` : '/admin/security');
  }

  return (
    <SavedViewsBar<AuditFilters>
      views={views}
      currentFilters={current}
      onApply={applyView}
      onSave={(name) => save(name, current)}
      onRemove={remove}
      // Page is part of the filter so saving works "from this exact spot",
      // but matching ignores page so an already-saved view with q=X still
      // highlights when the operator paginated within X.
      isMatch={(a, b) => a.q === b.q}
    />
  );
}
