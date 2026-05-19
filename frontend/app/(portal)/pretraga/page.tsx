import type { Metadata } from "next";
import { Search } from "lucide-react";
import { articlesAPI } from "@/lib/api";
import { ArticleCard } from "@/components/articles/ArticleCard";

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Pretraga: "${q}" – K1.ba` : "Pretraga – K1.ba",
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, page: pageStr } = await searchParams;
  const page = parseInt(pageStr || "1");

  let results = null;
  if (q) {
    try {
      results = await articlesAPI.search(q, page);
    } catch {
      // ignore
    }
  }

  return (
    <div className="container-news py-8">
      <div className="max-w-2xl mx-auto mb-10">
        <h1 className="text-3xl font-black font-serif mb-6 text-center">
          {q ? `Rezultati za "${q}"` : "Pretraga vijesti"}
        </h1>
        <form action="/pretraga" method="GET">
          <div className="relative">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Pretražite vijesti..."
              className="input-field pl-12 pr-4 text-lg py-4"
              autoFocus={!q}
            />
          </div>
        </form>
      </div>

      {results ? (
        <>
          <p className="text-neutral-500 text-sm mb-6">
            Pronađeno {results.total} rezultata za &quot;{results.query}&quot;
          </p>
          {results.articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.articles.map((article, i) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  variant="default"
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-neutral-400">
              <Search size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg">Nema rezultata za &quot;{q}&quot;</p>
              <p className="text-sm mt-2">Pokušajte sa drugačijim pojmom</p>
            </div>
          )}
        </>
      ) : (
        !q && (
          <div className="text-center py-20 text-neutral-400">
            <Search size={48} className="mx-auto mb-4 opacity-30" />
            <p>Unesite pojam za pretragu</p>
          </div>
        )
      )}
    </div>
  );
}
