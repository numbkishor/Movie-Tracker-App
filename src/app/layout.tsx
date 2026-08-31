import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import { ThemeScript } from "@/components/nav/theme-script";
import "./globals.css";

// design.md's two faces: Space Grotesk for display, Inter for everything else.
// Loaded through next/font so they are self-hosted — no third-party request on
// every page load, and no layout shift.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Reelist",
    template: "%s · Reelist",
  },
  description: "A private movie watched-list you and your friends actually keep using.",
  applicationName: "Reelist",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Reelist",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // Watched lists are private; there is nothing here worth indexing.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // The browser chrome colour cannot read a CSS variable, so these two are the
  // one place --bg is repeated as a literal. They mirror design.md's palette;
  // change them together with globals.css.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#15130f" },
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${spaceGrotesk.variable} ${inter.variable} min-h-dvh antialiased`}>
        {children}
      </body>
    </html>
  );
}
