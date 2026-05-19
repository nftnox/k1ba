export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  featuredImage: string | null;
  featuredImageAlt: string | null;
  category: Category;
  categoryId: string;
  author: Author | null;
  authorId: string | null;
  tags: Tag[];
  publishedAt: Date | string;
  updatedAt: Date | string;
  createdAt: Date | string;
  isBreaking: boolean;
  isFeatured: boolean;
  status: ArticleStatus;
  readingTime: number;
  viewCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  aiProcessed: boolean;
  comments?: Comment[];
  _count?: {
    comments: number;
    reactions: number;
    views: number;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  _count?: {
    articles: number;
  };
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Author {
  id: string;
  name: string;
  bio: string | null;
  avatar: string | null;
  email?: string;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  authorId: string;
  articleId: string;
  parentId: string | null;
  replies?: Comment[];
  reactions: CommentReaction[];
  createdAt: Date | string;
  updatedAt: Date | string;
  isApproved: boolean;
  reportCount: number;
  _count?: {
    replies: number;
    reactions: number;
  };
}

export interface CommentReaction {
  id: string;
  type: ReactionType;
  userId: string;
  commentId: string;
}

export interface ArticleReaction {
  id: string;
  type: ReactionType;
  userId: string;
  articleId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  createdAt: Date | string;
  _count?: {
    comments: number;
  };
}

export type ArticleStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";
export type UserRole = "USER" | "MODERATOR" | "ADMIN";
export type ReactionType = "LIKE" | "DISLIKE" | "LOVE" | "ANGRY" | "SAD";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchResult {
  articles: Article[];
  total: number;
  query: string;
}

export interface ArticleFilters {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  sort?: "newest" | "oldest" | "popular" | "trending";
  featured?: boolean;
  breaking?: boolean;
}

export interface ScraperLog {
  id: string;
  source: string;
  status: "SUCCESS" | "FAILED" | "RUNNING";
  articlesFound: number;
  articlesProcessed: number;
  errors: string[];
  startedAt: Date | string;
  completedAt: Date | string | null;
}

export interface AdminStats {
  totalArticles: number;
  publishedArticles: number;
  pendingArticles: number;
  totalComments: number;
  pendingComments: number;
  totalUsers: number;
  todayViews: number;
  totalViews: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  children?: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface SEOMeta {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
}
