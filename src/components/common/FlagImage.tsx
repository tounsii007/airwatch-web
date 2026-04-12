'use client';

import { ManagedImage } from '@/components/common/ManagedImage';

export function FlagImage({
  code,
  className,
  height = 16,
  width = 20,
}: {
  className?: string;
  code: string;
  height?: number;
  width?: number;
}) {
  return (
    <ManagedImage
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      width={width}
      height={height}
      unoptimized
      className={className}
    />
  );
}
