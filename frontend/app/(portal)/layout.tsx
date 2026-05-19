import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BreakingNewsTicker } from "@/components/layout/BreakingNewsTicker";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { articlesAPI } from "@/lib/api";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let breakingArticles = [];
  try {
    breakingArticles = await articlesAPI.getBreaking();
  } catch {
    // silently fail if backend not available
  }

  return (
    <>
      <Navbar />
      {breakingArticles.length > 0 && (
        <BreakingNewsTicker articles={breakingArticles} />
      )}
      <main className="min-h-screen pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
