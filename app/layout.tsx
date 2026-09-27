import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider, PALETTE_SCRIPT } from "@/components/theme-provider";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { env } from "@/env";

// One family for UI, mono for numeric metadata. See DESIGN.md §3.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Defaults every page inherits. Pages override title/description; the template
// appends the brand so each tab and search result reads "Dune (2021) · NextToBinge".
// No canonical here: children inherit it, and every page would claim to be "/".
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Discover Movies, Series & Anime`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // The image comes from app/opengraph-image.tsx.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  // Search Console ownership check (the HTML-tag method). Omitted when unset.
  verification: env.GOOGLE_SITE_VERIFICATION
    ? { google: env.GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Without viewport-fit=cover every env(safe-area-inset-*) resolves to 0px.
  viewportFit: "cover",
  // Makes the Android software keyboard shrink the layout viewport, so dvh
  // and bottom-pinned UI react the way they already do on iOS.
  interactiveWidget: "resizes-content",
  // Default (violet · dark); ThemeProvider rewrites this on every switch.
  themeColor: "#111016",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Point Clerk at app/(auth); otherwise modal hand-offs (e.g. an OAuth
    // account that already exists) fall back to the hosted Account Portal.
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html
        lang="en"
        suppressHydrationWarning
        className={cn("h-full antialiased font-sans", geistSans.variable, geistMono.variable)}
      >
        <head>
          {/* Applies the stored palette before first paint. next-themes injects
              its own equivalent for the light/dark class. */}
          <script dangerouslySetInnerHTML={{ __html: PALETTE_SCRIPT }} />
        </head>
        <body className="min-h-full flex flex-col">
          <ThemeProvider>{children}</ThemeProvider>
          {/* Page views and Core Web Vitals from real visitors. Both are
              cookieless and only report on Vercel deployments. */}
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
