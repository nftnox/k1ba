import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { articlesAPI, categoriesAPI } from "@/lib/api";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { ArticleGrid } from "@/components/articles/ArticleGrid";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const category = await categoriesAPI.getBySlug(slug);
    return {
      title: `${category.name} – K1.ba`,
      description: category.description || `Vijesti iz kategorije ${category.name} na K1.ba`,
    };
  } catch {
    return { title: “Kategorija – K1.ba” };
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  let category;
  try {
    category = await categoriesAPI.getBySlug(slug);
  } catch {
    notFound();
  }

  let articles: any[] = [];
  let total: number = 0;
  try {
    const res = await articlesAPI.getByCategory(slug, 1, 12);
    articles = res.data;
    total = res.pagination.total;
  } catch {
    // ignore
  }

  const featuredArticle = articles[0];
  const restArticles = articles.slice(1);

  return (
    <div className="container-news py-8">
      {/* Category header */}
      <div className="mb-10 pb-8 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-2 h-10 rounded-full"
            style={{ backgroundColor: category.color || "#ed1515" }}
          />
          <h1 className="text-4xl font-black font-serif">{category.name}</h1>
        </div>
        {category.description && (
          <p className="text-neutral-500 mt-2 max-w-2xl">{category.description}</p>
        )}
        <p className="text-sm text-neutral-400 mt-3">
          {total} vijesti u ovoj kategoriji
        </p>
      </div>

      {/* Featured */}
      {featuredArticle && (
        <div className="mb-10">
          <ArticleCard article={featuredArticle} variant="hero" priority index={0} />
        </div>
      )}

      {/* Grid */}
      {restArticles.length > 0 ? (
        <ArticleGrid
          initialArticles={restArticles}
          initialTotal={total - 1}
          filters={{ category: slug, sort: "newest" }}
          columns={3}
          infiniteScroll
        />
      ) : (
        <div className="text-center py-20 text-neutral-400">
          <p>Nema vijesti u ovoj kategoriji</p>
        </div>
      )}
    </div>
  );
}
