'use client';

import { ManagedImage } from '@/components/common/ManagedImage';

export function LogoImage({
  alt = '',
  className,
  fallback,
  fill = false,
  height,
  sizes,
  src,
  width,
}: {
  alt?: string;
  className?: string;
  /** Rendered when the underlying <img> fires onError (e.g. logo CDN 404). */
  fallback?: React.ReactNode;
  fill?: boolean;
  height?: number;
  sizes?: string;
  src: string;
  width?: number;
}) {
  return (
    <ManagedImage
      src={src}
      alt={alt}
      fallback={fallback}
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized
      className={className}
    />
  );
}
