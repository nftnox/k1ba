import type { Metadata } from "next";
import { BarChart2 } from "lucide-react";
import { articlesAPI } from "@/lib/api";
import { ArticleCard } from "@/components/articles/ArticleCard";

export const metadata: Metadata = {
  title: "Popularno – K1.ba",
  description: "Najpopularnije vijesti prema broju pregleda na K1.ba",
};

export const revalidate = 600;

export default async function PopularnoPage() {
  let articles = [];
  try {
    const res = await articlesAPI.getAll({ sort: "popular", page: 1, limit: 30 });
    articles = res.data;
  } catch {
    // ignore
  }

  return (
    <div className="container-news py-8">
      <div className="mb-10">
        <div className="section-divider" />
        <h1 className="section-title flex items-center gap-3 text-4xl">
          <BarChart2 size={32} className="text-brand-600" />
          Popularno
        </h1>
        <p className="text-neutral-500 mt-2">Vijesti koje čita najviše čitalaca</p>
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
          <BarChart2 size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nema podataka</p>
        </div>
      )}
    </div>
  );
}
