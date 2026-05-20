import { Router } from "express";
import { prisma } from "../utils/prisma";
import { cacheGet, cacheSet } from "../utils/redis";
import type { Request, Response } from "express";

export const articlesRouter = Router();

const ARTICLE_INCLUDE = {
  category: true,
  tags: { include: { tag: true } },
  author: { select: { id: true, name: true, image: true, bio: true } },
  _count: { select: { comments: true, reactions: true, views: true } },
};

// GET /api/articles
articlesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const page = parseInt(String(req.query.page)) || 1;
    const limit = Math.min(parseInt(String(req.query.limit)) || 12, 50);
    const skip = (page - 1) * limit;
    const category = req.query.category as string | undefined;
    const tag = req.query.tag as string | undefined;
    const sort = (req.query.sort as string) || "newest";
    const featured = req.query.featured === "true";
    const breaking = req.query.breaking === "true";

    const where = {
      status: "PUBLISHED" as const,
      publishedAt: { lte: new Date() },
      ...(category && { category: { slug: category } }),
      ...(tag && { tags: { some: { tag: { slug: tag } } } }),
      ...(featured && { isFeatured: true }),
      ...(breaking && { isBreaking: true }),
    };

    const orderBy =
      sort === "popular"
        ? { viewCount: "desc" as const }
        : sort === "oldest"
        ? { publishedAt: "asc" as const }
        : { publishedAt: "desc" as const };

    const cacheKey = `articles:${JSON.stringify({ where, skip, limit, orderBy })}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: ARTICLE_INCLUDE,
      }),
      prisma.article.count({ where }),
    ]);

    const result = {
      data: articles.map(transformArticle),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };

    await cacheSet(cacheKey, result, 120);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Greška pri dohvatanju vijesti" });
  }
});

// GET /api/articles/featured
articlesRouter.get("/featured", async (_req: Request, res: Response) => {
  try {
    const cached = await cacheGet("articles:featured");
    if (cached) return res.json(cached);

    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED", isFeatured: true, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      take: 6,
      include: ARTICLE_INCLUDE,
    });

    const result = articles.map(transformArticle);
    await cacheSet("articles:featured", result, 300);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

// GET /api/articles/breaking
articlesRouter.get("/breaking", async (_req: Request, res: Response) => {
  try {
    const cached = await cacheGet("articles:breaking");
    if (cached) return res.json(cached);

    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED", isBreaking: true, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: "desc" },
      take: 10,
      include: ARTICLE_INCLUDE,
    });

    const result = articles.map(transformArticle);
    await cacheSet("articles:breaking", result, 60);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

// GET /api/articles/trending
articlesRouter.get("/trending", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit)) || 10, 30);
    const cacheKey = `articles:trending:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    // Count views in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trendingIds = await prisma.articleView.groupBy({
      by: ["articleId"],
      where: { createdAt: { gte: since } },
      _count: { articleId: true },
      orderBy: { _count: { articleId: "desc" } },
      take: limit,
    });

    const ids = trendingIds.map((t) => t.articleId);

    const articles = await prisma.article.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      include: ARTICLE_INCLUDE,
    });

    // Sort by trending order
    const sorted = ids
      .map((id) => articles.find((a) => a.id === id))
      .filter(Boolean);

    const result = sorted.map(transformArticle);
    await cacheSet(cacheKey, result, 300);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

// GET /api/articles/:slug
articlesRouter.get("/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const cacheKey = `article:${slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const article = await prisma.article.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: ARTICLE_INCLUDE,
    });

    if (!article) return res.status(404).json({ error: "Vijest nije pronađena" });

    const result = transformArticle(article);
    await cacheSet(cacheKey, result, 300);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

// GET /api/articles/:id/related
articlesRouter.get("/:id/related", async (req: Request, res: Response) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      select: { categoryId: true },
    });
    if (!article) return res.json([]);

    const related = await prisma.article.findMany({
      where: {
        categoryId: article.categoryId,
        status: "PUBLISHED",
        id: { not: String(req.params.id) },
      },
      orderBy: { publishedAt: "desc" },
      take: parseInt(String(req.query.limit)) || 5,
      include: ARTICLE_INCLUDE,
    });

    res.json(related.map(transformArticle));
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

// POST /api/articles/:id/view
articlesRouter.post("/:id/view", async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.headers["x-forwarded-for"]?.toString();
    const viewArticleId = String(req.params.id);
    await prisma.$transaction([
      prisma.articleView.create({
        data: {
          articleId: viewArticleId,
          ip: ip?.substring(0, 45),
          userAgent: req.headers["user-agent"]?.substring(0, 200),
        },
      }),
      prisma.article.update({
        where: { id: viewArticleId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformArticle(article: any) {
  const tags = (article.tags as Array<{ tag: unknown }>) || [];
  return {
    ...article,
    tags: tags.map((t: { tag: unknown }) => t.tag),
  };
}
