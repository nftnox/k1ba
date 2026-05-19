import type {
  Article,
  Category,
  Comment,
  PaginatedResponse,
  ArticleFilters,
  SearchResult,
  AdminStats,
  ScraperLog,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

async function fetchAPI<T>(
  path: string,
  options?: RequestInit,
  cache?: RequestCache
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    cache: cache || "no-store",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "API Error" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Articles
export const articlesAPI = {
  getAll: (filters?: ArticleFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined) params.set(k, String(v));
      });
    }
    return fetchAPI<PaginatedResponse<Article>>(
      `/api/articles?${params.toString()}`,
      undefined,
      "no-store"
    );
  },

  getBySlug: (slug: string) =>
    fetchAPI<Article>(`/api/articles/${slug}`, undefined, "no-store"),

  getFeatured: () =>
    fetchAPI<Article[]>(`/api/articles/featured`, undefined, "no-store"),

  getBreaking: () =>
    fetchAPI<Article[]>(`/api/articles/breaking`, undefined, "no-store"),

  getTrending: (limit: number = 10) =>
    fetchAPI<Article[]>(
      `/api/articles/trending?limit=${limit}`,
      undefined,
      "no-store"
    ),

  getRelated: (articleId: string, limit: number = 5) =>
    fetchAPI<Article[]>(
      `/api/articles/${articleId}/related?limit=${limit}`,
      undefined,
      "no-store"
    ),

  getByCategory: (slug: string, page: number = 1, limit: number = 12) =>
    fetchAPI<PaginatedResponse<Article>>(
      `/api/articles?category=${slug}&page=${page}&limit=${limit}`,
      undefined,
      "no-store"
    ),

  search: (query: string, page: number = 1) =>
    fetchAPI<SearchResult>(
      `/api/search?q=${encodeURIComponent(query)}&page=${page}`,
      undefined,
      "no-store"
    ),

  incrementView: (articleId: string) =>
    fetchAPI<void>(`/api/articles/${articleId}/view`, { method: "POST" }),

  // Admin
  create: (data: Partial<Article>, token: string) =>
    fetchAPI<Article>(`/api/admin/articles`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),

  update: (id: string, data: Partial<Article>, token: string) =>
    fetchAPI<Article>(`/api/admin/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),

  delete: (id: string, token: string) =>
    fetchAPI<void>(`/api/admin/articles/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  publish: (id: string, token: string) =>
    fetchAPI<Article>(`/api/admin/articles/${id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Categories
export const categoriesAPI = {
  getAll: () =>
    fetchAPI<Category[]>(`/api/categories`, undefined, "force-cache"),

  getBySlug: (slug: string) =>
    fetchAPI<Category>(`/api/categories/${slug}`, undefined, "force-cache"),
};

// Comments
export const commentsAPI = {
  getByArticle: (articleId: string, page: number = 1) =>
    fetchAPI<PaginatedResponse<Comment>>(
      `/api/comments?articleId=${articleId}&page=${page}`,
      undefined,
      "no-store"
    ),

  create: (data: { content: string; articleId: string; parentId?: string }, token: string) =>
    fetchAPI<Comment>(`/api/comments`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { Authorization: `Bearer ${token}` },
    }),

  react: (commentId: string, type: string, token: string) =>
    fetchAPI<void>(`/api/comments/${commentId}/react`, {
      method: "POST",
      body: JSON.stringify({ type }),
      headers: { Authorization: `Bearer ${token}` },
    }),

  report: (commentId: string, reason: string, token: string) =>
    fetchAPI<void>(`/api/comments/${commentId}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Auth
export const authAPI = {
  login: (email: string, password: string) =>
    fetchAPI<{ token: string; user: unknown }>(`/api/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    fetchAPI<{ token: string; user: unknown }>(`/api/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
};

// Newsletter
export const newsletterAPI = {
  subscribe: (email: string) =>
    fetchAPI<{ message: string }>(`/api/newsletter/subscribe`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
};

// Admin
export const adminAPI = {
  getStats: (token: string) =>
    fetchAPI<AdminStats>(`/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getScraperLogs: (token: string) =>
    fetchAPI<ScraperLog[]>(`/api/admin/scraper/logs`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  triggerScraper: (token: string) =>
    fetchAPI<{ message: string }>(`/api/admin/scraper/trigger`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
};
