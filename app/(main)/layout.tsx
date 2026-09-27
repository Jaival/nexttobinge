import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { GuestWatchlistSync } from "@/components/guest-watchlist-sync";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main
        className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8"
        style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </main>
      <SiteFooter />
      <Toaster position="bottom-right" />
      <GuestWatchlistSync />
    </>
  );
}
