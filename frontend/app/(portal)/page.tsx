import type { Metadata } from "next";
import Link from "next/link";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ArticleGrid } from "@/components/articles/ArticleGrid";
import { articlesAPI, categoriesAPI } from "@/lib/api";
import { HomepageLeaderboard, SidebarRectangle } from "@/components/ui/AdSlot";
import { TrendingUp, Clock, Star, ArrowRight, Newspaper, MessageCircle } from "lucide-react";
import type { Article } from "@/types";

export const metadata: Metadata = {
  title: "K1.ba – Vijesti iz Bosne i Hercegovine",
  description:
    "Najbrži i najmoderniji news portal u BiH – vijesti, politika, ekonomija, sport.",
};

export const revalidate = 60;

async function getData() {
  try {
    const [featuredRes, latestRes, trendingArticles, categories] =
      await Promise.allSettled([
        articlesAPI.getFeatured(),
        articlesAPI.getAll({ page: 1, limit: 12, sort: "newest" }),
        articlesAPI.getTrending(8),
        categoriesAPI.getAll(),
      ]);

    return {
      featured:
        featuredRes.status === "fulfilled" ? featuredRes.value : [],
      latest:
        latestRes.status === "fulfilled" ? latestRes.value.data : [],
      latestTotal:
        latestRes.status === "fulfilled"
          ? latestRes.value.pagination.total
          : 0,
      trending:
        trendingArticles.status === "fulfilled"
          ? trendingArticles.value
          : [],
      categories:
        categories.status === "fulfilled" ? categories.value : [],
    };
  } catch {
    return {
      featured: [] as Article[],
      latest: [] as Article[],
      latestTotal: 0,
      trending: [] as Article[],
      categories: [],
    };
  }
}

export default async function HomePage() {
  const { featured, latest, latestTotal, trending, categories } =
    await getData();

  const hero = featured[0];
  const heroSecondary = featured.slice(1, 3);

  return (
    <div className="pb-16">
      {/* Leaderboard ad – ispod navbara */}
      <HomepageLeaderboard />

      {/* Hero Section */}
      {hero && (
        <section className="container-news pt-4 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Main hero */}
            <div className="lg:col-span-2">
              <ArticleCard article={hero} variant="hero" priority index={0} />
            </div>
            {/* Secondary heroes */}
            <div className="flex flex-col gap-5">
              {heroSecondary.map((article, i) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant="featured"
                  priority={i === 0}
                  index={i}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories Quick Nav */}
      {categories.length > 0 && (
        <section className="border-y border-[hsl(var(--border))] bg-[hsl(var(--muted))] py-3">
          <div className="container-news">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/kategorije/${cat.slug}`}
                  className="flex-shrink-0 badge-category hover:bg-brand-100 dark:hover:bg-brand-900 transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="container-news mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-12">
            {/* Latest news */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="section-divider" />
                  <h2 className="section-title flex items-center gap-2">
                    <Clock size={20} className="text-brand-600" />
                    Najnovije vijesti
                  </h2>
                </div>
                <Link
                  href="/najnovije"
                  className="btn-ghost text-sm"
                >
                  Sve vijesti
                  <ArrowRight size={14} />
                </Link>
              </div>

              {latest.length > 0 ? (
                <ArticleGrid
                  initialArticles={latest}
                  initialTotal={latestTotal}
                  filters={{ sort: "newest" }}
                  columns={3}
                  infiniteScroll
                />
              ) : (
                <EmptyState />
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            {/* Trending */}
            {trending.length > 0 && (
              <div className="card-news p-5 lg:sticky lg:top-24">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="section-divider" />
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp size={18} className="text-brand-600" />
                      Trending
                    </h2>
                  </div>
                  <Link href="/trending" className="text-xs text-brand-600 hover:underline">
                    Sve →
                  </Link>
                </div>
                <div className="space-y-0">
                  {trending.slice(0, 8).map((article, i) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      variant="compact"
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Popular */}
            <div className="card-news p-5">
              <div className="mb-5">
                <div className="section-divider" />
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Star size={18} className="text-brand-600" />
                  Najpopularnije
                </h2>
              </div>
              <div className="space-y-4">
                {featured.slice(0, 5).map((article, i) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    variant="horizontal"
                    index={i}
                  />
                ))}
              </div>
            </div>

            {/* Sidebar ad */}
            <SidebarRectangle slot="homepage-sidebar" />

            {/* Newsletter widget */}
            <NewsletterWidget />
          </aside>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20 text-neutral-400">
      <Newspaper size={48} className="mx-auto mb-4 opacity-30" />
      <h3 className="text-lg font-semibold mb-2">Nema vijesti</h3>
      <p className="text-sm">
        Backend servis nije dostupan. Pokrenite Docker okruženje.
      </p>
    </div>
  );
}

function NewsletterWidget() {
  return (
    <div className="card-news p-5 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
      <h3 className="font-bold text-lg mb-2">Newsletter</h3>
      <p className="text-sm text-brand-100 mb-4">
        Najvažnije vijesti direktno u vaš inbox.
      </p>
      <form action="/api/newsletter/subscribe" method="POST" className="space-y-2">
        <input
          type="email"
          name="email"
          placeholder="vasa@email.ba"
          className="w-full px-4 py-2.5 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
        />
        <button
          type="submit"
          className="w-full py-2.5 bg-white text-brand-600 font-bold rounded-lg hover:bg-brand-50 transition-colors text-sm"
        >
          Pretplati se besplatno
        </button>
      </form>
    </div>
  );
}
