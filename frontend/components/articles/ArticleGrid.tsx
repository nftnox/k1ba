"use client";

import { useState, useCallback, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { ArticleCardSkeleton } from "@/components/ui/Skeleton";
import type { Article, ArticleFilters } from "@/types";
import { articlesAPI } from "@/lib/api";

interface ArticleGridProps {
  initialArticles: Article[];
  initialTotal: number;
  filters?: ArticleFilters;
  columns?: 2 | 3 | 4;
  infiniteScroll?: boolean;
}

export function ArticleGrid({
  initialArticles,
  initialTotal,
  filters = {},
  columns = 3,
  infiniteScroll = true,
}: ArticleGridProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(articles.length < initialTotal);
  const pageRef = useRef(1);

  const { ref } = useInView({
    threshold: 0.1,
    onChange: (inView) => {
      if (inView && hasMore && !loading && infiniteScroll) {
        loadMore();
      }
    },
  });

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const nextPage = pageRef.current + 1;
      const result = await articlesAPI.getAll({
        ...filters,
        page: nextPage,
        limit: 12,
      });
      setArticles((prev) => [...prev, ...result.data]);
      pageRef.current = nextPage;
      setPage(nextPage);
      setHasMore(result.pagination.hasNext);
    } catch (error) {
      console.error("Error loading more articles:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, filters]);

  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  }[columns];

  return (
    <div>
      <div className={`grid ${colClass} gap-6`}>
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

      {/* Infinite scroll trigger */}
      {infiniteScroll && hasMore && (
        <div ref={ref} className="mt-8">
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual load more */}
      {!infiniteScroll && hasMore && (
        <div className="text-center mt-10">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn-primary min-w-48"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Učitavam...
              </>
            ) : (
              "Prikaži više vijesti"
            )}
          </button>
        </div>
      )}

      {!hasMore && articles.length > 0 && (
        <p className="text-center text-neutral-400 text-sm mt-8 py-4">
          Prikazano svih {articles.length} vijesti
        </p>
      )}
    </div>
  );
}
