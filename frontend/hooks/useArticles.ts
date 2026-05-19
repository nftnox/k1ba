import useSWR from "swr";
import { articlesAPI } from "@/lib/api";
import type { ArticleFilters, PaginatedResponse, Article } from "@/types";

const fetcher = (filters: ArticleFilters) =>
  articlesAPI.getAll(filters);

export function useArticles(filters: ArticleFilters = {}) {
  const key = JSON.stringify({ ...filters, _type: "articles" });

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Article>>(
    key,
    () => fetcher(filters),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    articles: data?.data ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

export function useTrending(limit: number = 10) {
  const { data, error, isLoading } = useSWR(
    `trending:${limit}`,
    () => articlesAPI.getTrending(limit),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  return { articles: data ?? [], isLoading, error };
}
