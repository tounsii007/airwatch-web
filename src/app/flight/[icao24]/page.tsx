import { Suspense } from 'react';
import FlightDeepLinkPage from './client';

export async function generateStaticParams() {
  return [{ icao24: '_' }];
}

export default function Page() {
  return (
    <Suspense>
      <FlightDeepLinkPage />
    </Suspense>
  );
}
