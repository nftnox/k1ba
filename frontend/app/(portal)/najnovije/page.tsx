import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { articlesAPI } from "@/lib/api";
import { ArticleGrid } from "@/components/articles/ArticleGrid";

export const metadata: Metadata = {
  title: "Najnovije vijesti – K1.ba",
  description: "Najsvježije i najnovije vijesti iz BiH i regiona na K1.ba",
};

export const revalidate = 30;

export default async function NajnovijiPage() {
  let articles = [];
  let total = 0;

  try {
    const res = await articlesAPI.getAll({ page: 1, limit: 12, sort: "newest" });
    articles = res.data;
    total = res.pagination.total;
  } catch {
    // ignore
  }

  return (
    <div className="container-news py-8">
      <div className="mb-10">
        <div className="section-divider" />
        <h1 className="section-title flex items-center gap-3 text-4xl">
          <Clock size={32} className="text-brand-600" />
          Najnovije vijesti
        </h1>
        <p className="text-neutral-500 mt-2">
          Svježe vijesti – ažurirano svakih nekoliko minuta
        </p>
      </div>

      {articles.length > 0 ? (
        <ArticleGrid
          initialArticles={articles}
          initialTotal={total}
          filters={{ sort: "newest" }}
          columns={3}
          infiniteScroll
        />
      ) : (
        <div className="text-center py-20 text-neutral-400">
          <Clock size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nema novih vijesti</p>
        </div>
      )}
    </div>
  );
}
