import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";

const robotoSlabHeading = Roboto_Slab({ subsets: ["latin"], variable: "--font-heading" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextToBinge — Discover Movies, Dramas & Anime",
  description: "Find movies, dramas, and anime to watch. Save them in personal watchlists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={cn(
          "h-full antialiased font-sans",
          geistSans.variable,
          geistMono.variable,
          manrope.variable,
          robotoSlabHeading.variable
        )}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
