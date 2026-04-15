import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      <Toaster richColors position="bottom-right" />
    </>
  );
}
