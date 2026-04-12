'use client';

import { ManagedImage } from '@/components/common/ManagedImage';

export function LogoImage({
  alt = '',
  className,
  fill = false,
  height,
  sizes,
  src,
  width,
}: {
  alt?: string;
  className?: string;
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
      fill={fill}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized
      className={className}
    />
  );
}
