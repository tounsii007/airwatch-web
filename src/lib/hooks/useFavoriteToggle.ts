'use client';

/**
 * Shared favourite-toggle hook. The airline-detail, airport-detail, and
 * flight-detail pages all want the same recipe:
 *
 *   1. Flip the favorites store entry for this id.
 *   2. Fire a toast confirming the change (different copy for add/remove).
 *
 * Each page used to inline this logic, which made it easy for the copy
 * or duration to drift. This hook centralises both decisions so the
 * "saved" / "removed" UX stays consistent across every entity type, and
 * runs the toast titles through `t()` so they obey the active locale —
 * a German user sees „Lufthansa\" gespeichert, not the English string.
 */
import { useCallback } from 'react';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n/translations';
import type { FavoriteItem } from '@/lib/types';

interface Options {
  id: string;
  type: FavoriteItem['type'];
  /** Short code shown in the favourites list (e.g. "DLH", "FRA"). */
  label: string;
  /** Long name shown in the favourites list AND the toast. */
  subtitle?: string;
  /** Override the toast display name (defaults to `subtitle ?? label`). */
  displayName?: string;
  /** Extra fields baked into the favourite payload (airline-specific
   *  fields, route info, etc). */
  extras?: Partial<FavoriteItem>;
  /** Duration of the confirmation toast in ms. Defaults to 3000. */
  toastDuration?: number;
}

export function useFavoriteToggle({
  id,
  type,
  label,
  subtitle,
  displayName,
  extras,
  toastDuration = 3000,
}: Options): () => void {
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const language = useSettingsStore((s) => s.language);

  return useCallback(() => {
    const wasSaved = isFavorite(id);
    toggleFavorite({
      id,
      type,
      label,
      subtitle,
      addedAt: Date.now(),
      ...extras,
    } as FavoriteItem);
    const name = displayName ?? subtitle ?? label;
    const title = t(wasSaved ? 'removed_toast' : 'saved_toast', language).replace('{0}', name);
    if (wasSaved) {
      toast({ title, variant: 'default', duration: toastDuration });
    } else {
      toast.success({ title, duration: toastDuration });
    }
  }, [id, type, label, subtitle, displayName, extras, toastDuration, isFavorite, toggleFavorite, language]);
}
