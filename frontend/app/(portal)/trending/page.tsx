import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { articlesAPI } from "@/lib/api";
import { ArticleCard } from "@/components/articles/ArticleCard";

export const metadata: Metadata = {
  title: "Trending vijesti – K1.ba",
  description: "Najpopularnije i najtrendiranije vijesti na K1.ba",
};

export const revalidate = 300;

export default async function TrendingPage() {
  let articles = [];
  try {
    articles = await articlesAPI.getTrending(30);
  } catch {
    // ignore
  }

  return (
    <div className="container-news py-8">
      <div className="mb-10">
        <div className="section-divider" />
        <h1 className="section-title flex items-center gap-3 text-4xl">
          <TrendingUp size={32} className="text-brand-600" />
          Trending vijesti
        </h1>
        <p className="text-neutral-500 mt-2">Najčitanije vijesti u posljednjih 24 sata</p>
      </div>

      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, i) => (
            <ArticleCard
              key={article.id}
              article={article}
              variant="default"
              index={i}
              priority={i < 3}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-neutral-400">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nema trending vijesti</p>
        </div>
      )}
    </div>
  );
}
