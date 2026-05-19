import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { articlesAPI } from "@/lib/api";
import { ArticleGrid } from "@/components/articles/ArticleGrid";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = slug.replace(/-/g, " ");
  return {
    title: `#${tag} – K1.ba`,
    description: `Vijesti sa tagom "${tag}" na K1.ba`,
  };
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const tagName = slug.replace(/-/g, " ");

  let articles: any[] = [];
  let total: number = 0;

  try {
    const res = await articlesAPI.getAll({ tag: slug, page: 1, limit: 12 });
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
          <Tag size={28} className="text-brand-600" />
          #{tagName}
        </h1>
        <p className="text-neutral-500 mt-2">{total} vijesti sa ovim tagom</p>
      </div>

      {articles.length > 0 ? (
        <ArticleGrid
          initialArticles={articles}
          initialTotal={total}
          filters={{ tag: slug }}
          columns={3}
          infiniteScroll
        />
      ) : (
        <div className="text-center py-20 text-neutral-400">
          <Tag size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nema vijesti sa tagom &quot;{tagName}&quot;</p>
        </div>
      )}
    </div>
  );
}
