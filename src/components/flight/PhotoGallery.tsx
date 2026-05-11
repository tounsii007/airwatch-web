'use client';

/**
 * Aircraft photo carousel modal.
 *
 * <h3>UX features</h3>
 *   * Keyboard: ArrowLeft / ArrowRight to navigate, Esc to close,
 *     Home / End to jump to first / last.
 *   * Touch: horizontal swipe to navigate (≥ 50px threshold).
 *   * Focus trap: while open, Tab cycles through the modal's focusable
 *     elements; Shift+Tab cycles backwards. Initial focus lands on
 *     the close button so a screen-reader user always lands somewhere
 *     deterministic.
 *   * Preload: the next-and-previous images are fetched in the
 *     background so flipping through the gallery doesn't show a
 *     loading flash.
 *   * Background-click closes; modal click does not (event-stop).
 *
 * <h3>Source attribution</h3>
 * Photos come from planespotters.net via the api proxy. Each photo
 * carries a photographer name — when the upstream provides a link
 * back to the source we render it as a clickable attribution; without
 * a link the name is rendered as plain text. We never show the photo
 * without attribution.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { API } from '@/lib/constants';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';

export interface Photo {
  src: string;
  photographer?: string;
  link?: string;
}

interface Props {
  icao24: string;
  onClose: () => void;
}

/** Minimum drag distance (px) before we count a swipe. */
const SWIPE_THRESHOLD = 50;

export function PhotoGallery({ icao24, onClose }: Props) {
  const language = useSettingsStore((s) => s.language);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  // Touch tracking — set on touchstart, used on touchend.
  const touchStartXRef = useRef<number | null>(null);

  // ── Fetch photos ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function fetchPhotos() {
      try {
        const res = await fetch(API.aircraftPhoto(icao24));
        if (cancelled) return;
        if (!res.ok) return; // empty list → empty-state renders below
        const data = await res.json();
        if (cancelled) return;
        if (data?.photos && Array.isArray(data.photos)) {
          const parsed: Photo[] = data.photos
            .map((p: Record<string, unknown>) => ({
              src: API.imageProxy(String(
                (p.thumbnail_large as Record<string, string>)?.src ??
                (p.thumbnail as Record<string, string>)?.src ?? '')),
              photographer: String(p.photographer ?? ''),
              link: String(p.link ?? ''),
            }))
            .filter((p: Photo) => p.src);
          setPhotos(parsed);
        }
      } catch { /* fail-soft — empty state shows below */ }
      finally {
        // Ensure we clear the loading flag on every exit path including
        // a non-OK response — the early-return form (`return;` after
        // `if (!res.ok)`) used to leave us spinning forever.
        if (!cancelled) setLoading(false);
      }
    }
    fetchPhotos();
    return () => { cancelled = true; };
  }, [icao24]);

  // ── Navigation helpers ─────────────────────────────────────────
  const prev = useCallback(
    () => setCurrentIndex((i) => (photos.length === 0 ? 0 : (i - 1 + photos.length) % photos.length)),
    [photos.length]);
  const next = useCallback(
    () => setCurrentIndex((i) => (photos.length === 0 ? 0 : (i + 1) % photos.length)),
    [photos.length]);

  // ── Keyboard nav + focus trap ──────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); return; }
      if (e.key === 'Home') { e.preventDefault(); setCurrentIndex(0); return; }
      if (e.key === 'End')  { e.preventDefault(); setCurrentIndex(Math.max(0, photos.length - 1)); return; }

      // Focus trap on Tab.
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], a, input, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    // Initial focus on the close button so screen readers land deterministically.
    closeBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length, onClose, prev, next]);

  // ── Preload neighbours ─────────────────────────────────────────
  useEffect(() => {
    if (photos.length < 2) return;
    const preload = (idx: number) => {
      const p = photos[(idx + photos.length) % photos.length];
      if (p?.src) {
        const img = new Image();
        img.src = p.src;
      }
    };
    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }, [currentIndex, photos]);

  // ── Touch swipe ────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartXRef.current;
    touchStartXRef.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const dx = end - start;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0) prev();
    else next();
  };

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center">
        <Camera size={32} className="text-white/40 animate-pulse" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('photo_gallery_nav_label', language)}
        className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center"
        onClick={onClose}
      >
        <div className="text-center">
          <Camera size={48} className="mx-auto text-white/30 mb-3" />
          <p className="text-white/50 text-sm">{t('no_photos_available', language)}</p>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="mt-3 px-4 py-1.5 text-xs text-white/70 hover:text-white border border-white/20 rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const photo = photos[currentIndex];

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('photo_gallery_label', language)}
      className="fixed inset-0 z-[2000] bg-black/95 flex flex-col"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4" onClick={(e) => e.stopPropagation()}>
        <span
          aria-live="polite"
          className="text-white/60 text-xs font-[var(--font-heading)] tracking-wider"
        >
          {currentIndex + 1} / {photos.length}
        </span>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label={t('photo_gallery_close', language)}
          className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main photo */}
      <div className="flex-1 flex items-center justify-center px-4 relative" onClick={(e) => e.stopPropagation()}>
        {photos.length > 1 && (
          <button
            type="button"
            onClick={prev}
            aria-label={t('photo_gallery_previous', language)}
            className="absolute left-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer z-10"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={`Aircraft photograph ${currentIndex + 1} of ${photos.length}` +
               (photo.photographer ? ` by ${photo.photographer}` : '')}
          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {photos.length > 1 && (
          <button
            type="button"
            onClick={next}
            aria-label={t('photo_gallery_next', language)}
            className="absolute right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer z-10"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Attribution + thumbnails */}
      <div className="p-4" onClick={(e) => e.stopPropagation()}>
        {photo.photographer && (
          <p className="text-white/40 text-[10px] text-center mb-3 font-[var(--font-body)]">
            Photo by {photo.link ? (
              <a
                href={photo.link}
                target="_blank"
                rel="noreferrer noopener"
                className="underline hover:text-white/70"
              >
                {photo.photographer}
              </a>
            ) : (
              photo.photographer
            )} · planespotters.net
          </p>
        )}
        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div role="tablist" aria-label="Photo thumbnails" className="flex gap-2 justify-center overflow-x-auto pb-2 scrollbar-none">
            {photos.map((p, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === currentIndex}
                aria-label={`Photo ${i + 1}`}
                onClick={() => setCurrentIndex(i)}
                className={`w-14 h-10 rounded overflow-hidden shrink-0 cursor-pointer transition-all ${
                  i === currentIndex ? 'ring-2 ring-[var(--primary)] opacity-100' : 'opacity-40 hover:opacity-70'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
