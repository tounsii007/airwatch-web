import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "@/app/globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { GlobalEffects } from "@/components/layout/GlobalEffects";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
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

export const metadata: Metadata = {
  title: "AirWatch — Real-time Flight Tracking",
  description: "Track flights worldwide in real-time with AirWatch",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon-192.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.svg" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AirWatch",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${orbitron.variable} ${rajdhani.variable} dark`}>
      <body className="h-screen bg-[var(--bg)] text-[var(--text-primary)] overflow-hidden" suppressHydrationWarning>
        <ThemeProvider />
        <GlobalEffects />
        <BottomNav />
        {/* Desktop: offset for sidebar (lg:pl-20), Mobile: offset for bottom bar (pb-20) */}
        <main className="h-full overflow-auto pb-20 lg:pb-0 lg:pt-12">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <DevTools />
      </body>
    </html>
  );
}
