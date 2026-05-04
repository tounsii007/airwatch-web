import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import { headers } from "next/headers";
import "@/app/globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { GlobalEffects } from "@/components/layout/GlobalEffects";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { WebVitalsReporter } from "@/components/layout/WebVitalsReporter";
import { ServiceWorkerRegistrar } from "@/components/layout/ServiceWorkerRegistrar";
import { CommandPaletteController } from "@/components/layout/CommandPaletteController";
import { StatsBeacon } from "@/components/layout/StatsBeacon";
import { DevTools } from "@/components/debug/DevTools";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// metadataBase is required for Next to build absolute URLs for OG/Twitter
// images. Falls back to localhost in dev so the meta tags still render
// during `npm run dev`.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:13000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AirWatch — Real-time Flight Tracking',
    template: '%s · AirWatch',
  },
  description:
    'Track flights worldwide in real-time. Live aircraft positions, weather radar, airport data, geo-fence alerts.',
  applicationName: 'AirWatch',
  authors: [{ name: 'AirWatch' }],
  keywords: [
    'flight tracker',
    'aircraft tracking',
    'live flights',
    'airport map',
    'weather radar',
    'aviation',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icons/icon-192.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/icon-192.svg' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AirWatch',
  },
  // Social-preview meta tags. Falls back gracefully when the OG image
  // isn't deployed (Next emits the default 'website' card).
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'AirWatch',
    title: 'AirWatch — Real-time Flight Tracking',
    description:
      'Track flights worldwide in real-time. Live positions + weather radar.',
    images: [{ url: '/icons/icon-192.svg', width: 192, height: 192 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AirWatch — Real-time Flight Tracking',
    description: 'Track flights worldwide in real-time.',
    images: ['/icons/icon-192.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

// Next.js 14+ split themeColor / viewport out of `metadata` into their own
// `viewport` export. Keeping them here silences the deprecation warning and
// matches the official Next 16 API.
// https://nextjs.org/docs/app/api-reference/functions/generate-viewport
export const viewport: Viewport = {
  themeColor: "#0A1628",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the per-request CSP nonce that proxy.ts stamped on the request
  // headers. Next.js auto-applies it to its own inline scripts because
  // proxy also sets `Content-Security-Policy` on the request headers —
  // we don't need to manually pass it to <NextScript>. Kept here in
  // case client-side code later needs to reference it (e.g. dynamically
  // injected scripts that should match the policy).
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning className={`${orbitron.variable} ${rajdhani.variable} dark`}>
      <body className="h-screen bg-[var(--bg)] text-[var(--text-primary)] overflow-hidden" suppressHydrationWarning>
        {/*
          The nonce attribute on <body> is consumed by Next.js's runtime
          via the React `nonce` channel — every Next-emitted inline
          script (RSC payload, hydration, chunk loader) is stamped with
          this nonce, satisfying the CSP without 'unsafe-inline'.
        */}
        <ThemeProvider />
        <GlobalEffects />
        <ServiceWorkerRegistrar />
        <WebVitalsReporter />
        <StatsBeacon />
        <BottomNav />
        <CommandPaletteController />
        {/* Mobile: top-bar offset (pt-11) + bottom-bar offset (pb-20).
            Desktop: top-bar offset (lg:pt-12), no bottom bar. */}
        <main className="h-full overflow-auto pt-11 pb-20 lg:pt-12 lg:pb-0">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <DevTools />
        {nonce && <meta name="csp-nonce" content={nonce} />}
      </body>
    </html>
  );
}
