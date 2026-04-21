import type { Metadata } from "next";
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
  themeColor: "#0A1628",
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
