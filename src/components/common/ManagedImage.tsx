'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

type ManagedImageProps = ImageProps & {
  fallback?: React.ReactNode;
};

export function ManagedImage({ alt = '', fallback = null, onError, ...props }: ManagedImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <>{fallback}</>;
  }

  return (
    <Image
      alt={alt}
      {...props}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
