'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { API } from '@/lib/constants';

interface Photo {
  src: string;
  photographer?: string;
  link?: string;
}

export function PhotoGallery({ icao24, onClose }: { icao24: string; onClose: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const res = await fetch(API.aircraftPhoto(icao24));
        const data = await res.json();
        if (data?.photos && Array.isArray(data.photos)) {
          setPhotos(data.photos.map((p: Record<string, unknown>) => ({
            src: API.imageProxy(String((p.thumbnail_large as Record<string, string>)?.src ?? (p.thumbnail as Record<string, string>)?.src ?? '')),
            photographer: String(p.photographer ?? ''),
            link: String(p.link ?? ''),
          })).filter((p: Photo) => p.src));
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchPhotos();
  }, [icao24]);

  const prev = () => setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setCurrentIndex((i) => (i + 1) % photos.length);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center">
        <Camera size={32} className="text-white/40 animate-pulse" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center" onClick={onClose}>
        <div className="text-center">
          <Camera size={48} className="mx-auto text-white/30 mb-3" />
          <p className="text-white/50 text-sm">No photos available</p>
        </div>
      </div>
    );
  }

  const photo = photos[currentIndex];

  return (
    <div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between p-4" onClick={(e) => e.stopPropagation()}>
        <span className="text-white/60 text-xs font-[var(--font-heading)] tracking-wider">
          {currentIndex + 1} / {photos.length}
        </span>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer">
          <X size={20} />
        </button>
      </div>

      {/* Main photo */}
      <div className="flex-1 flex items-center justify-center px-4 relative" onClick={(e) => e.stopPropagation()}>
        {photos.length > 1 && (
          <button onClick={prev} className="absolute left-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer z-10">
            <ChevronLeft size={24} />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt=""
          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {photos.length > 1 && (
          <button onClick={next} className="absolute right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer z-10">
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Attribution + thumbnails */}
      <div className="p-4" onClick={(e) => e.stopPropagation()}>
        {photo.photographer && (
          <p className="text-white/40 text-[10px] text-center mb-3 font-[var(--font-body)]">
            Photo by {photo.photographer} · planespotters.net
          </p>
        )}
        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-2 justify-center overflow-x-auto pb-2 scrollbar-none">
            {photos.map((p, i) => (
              <button
                key={i}
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
