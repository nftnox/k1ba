import { Router } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, requireAdmin, requireModerator, type AuthRequest } from "../middleware/auth";
import { cacheDelPattern } from "../utils/redis";
import slugify from "slugify";
import type { Response } from "express";

export const adminRouter = Router();

adminRouter.use(authenticate);

// Stats
adminRouter.get("/stats", requireModerator, async (_req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalArticles,
      publishedArticles,
      pendingArticles,
      totalComments,
      pendingComments,
      totalUsers,
      todayViews,
      totalViews,
    ] = await Promise.all([
      prisma.article.count(),
      prisma.article.count({ where: { status: "PUBLISHED" } }),
      prisma.article.count({ where: { status: "PENDING" } }),
      prisma.comment.count({ where: { isDeleted: false } }),
      prisma.comment.count({ where: { isApproved: false, isDeleted: false } }),
      prisma.user.count(),
      prisma.articleView.count({ where: { createdAt: { gte: today } } }),
      prisma.articleView.count(),
    ]);

    res.json({
      totalArticles,
      publishedArticles,
      pendingArticles,
      totalComments,
      pendingComments,
      totalUsers,
      todayViews,
      totalViews,
    });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

// Articles management
adminRouter.get("/articles", requireModerator, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page)) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where = status ? { status: status as "PUBLISHED" | "DRAFT" | "PENDING" | "ARCHIVED" } : {};

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          category: { select: { name: true, slug: true } },
          _count: { select: { comments: true, views: true } },
        },
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      data: articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

adminRouter.post("/articles", requireModerator, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, excerpt, content, categoryId, featuredImage, isBreaking, isFeatured,
      metaTitle, metaDescription, metaKeywords, tags, status,
    } = req.body;

    const slug =
      slugify(title, { lower: true, strict: true, locale: "bs" }) +
      "-" +
      Date.now().toString(36);

    const article = await prisma.article.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        categoryId,
        featuredImage,
        isBreaking: Boolean(isBreaking),
        isFeatured: Boolean(isFeatured),
        metaTitle,
        metaDescription,
        metaKeywords,
        authorId: req.user!.id,
        status: status || "DRAFT",
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        readingTime: Math.max(1, Math.ceil(content?.split(" ").length / 200)),
      },
    });

    if (tags?.length) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { slug: slugify(tagName, { lower: true }) },
          create: { name: tagName, slug: slugify(tagName, { lower: true }) },
          update: {},
        });
        await prisma.articleTag.create({
          data: { articleId: article.id, tagId: tag.id },
        });
      }
    }

    await cacheDelPattern("articles:*");
    res.status(201).json(article);
  } catch {
    res.status(500).json({ error: "Greška pri kreiranju" });
  }
});

adminRouter.put("/articles/:id", requireModerator, async (req: AuthRequest, res: Response) => {
  try {
    const { title, excerpt, content, featuredImage, isBreaking, isFeatured,
      metaTitle, metaDescription, metaKeywords, categoryId, status } = req.body;

    const articleId = String(req.params.id);
    const article = await prisma.article.update({
      where: { id: articleId },
      data: {
        title,
        excerpt,
        content,
        featuredImage,
        isBreaking: Boolean(isBreaking),
        isFeatured: Boolean(isFeatured),
        metaTitle,
        metaDescription,
        metaKeywords,
        categoryId,
        status,
        readingTime: content ? Math.max(1, Math.ceil(content.split(" ").length / 200)) : undefined,
        publishedAt:
          status === "PUBLISHED"
            ? await prisma.article
                .findUnique({ where: { id: articleId }, select: { publishedAt: true } })
                .then((a) => a?.publishedAt || new Date())
            : undefined,
      },
    });

    await cacheDelPattern("articles:*");
    await cacheDelPattern(`article:${article.slug}`);
    res.json(article);
  } catch {
    res.status(500).json({ error: "Greška pri ažuriranju" });
  }
});

adminRouter.post("/articles/:id/publish", requireModerator, async (req: AuthRequest, res: Response) => {
  try {
    const article = await prisma.article.update({
      where: { id: String(req.params.id) },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await cacheDelPattern("articles:*");
    res.json(article);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

adminRouter.delete("/articles/:id", requireModerator, async (req: AuthRequest, res: Response) => {
  try {
    const article = await prisma.article.update({
      where: { id: String(req.params.id) },
      data: { status: "ARCHIVED" },
    });
    await cacheDelPattern("articles:*");
    res.json({ message: "Vijest je arhivirana" });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

// Comments moderation
adminRouter.get("/comments/pending", requireModerator, async (_req, res: Response) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { isApproved: false, isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, email: true } },
        article: { select: { title: true, slug: true } },
      },
    });
    res.json(comments);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

adminRouter.post("/comments/:id/approve", requireModerator, async (req, res: Response) => {
  try {
    await prisma.comment.update({
      where: { id: String(req.params.id) },
      data: { isApproved: true },
    });
    res.json({ message: "Komentar odobren" });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

adminRouter.delete("/comments/:id", requireModerator, async (req, res: Response) => {
  try {
    await prisma.comment.update({
      where: { id: String(req.params.id) },
      data: { isDeleted: true },
    });
    res.json({ message: "Komentar obrisan" });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

// Scraper logs
adminRouter.get("/scraper/logs", requireAdmin, async (_req, res: Response) => {
  try {
    const logs = await prisma.scraperLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 50,
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

adminRouter.post("/scraper/trigger", requireAdmin, async (_req, res: Response) => {
  try {
    const scraperUrl = process.env.SCRAPER_URL || "http://localhost:8001";
    const response = await fetch(`${scraperUrl}/api/scrape/trigger`, {
      method: "POST",
      headers: {
        "X-Secret": process.env.SCRAPER_SECRET || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Scraper nije dostupan");
    res.json({ message: "Scraper pokrenut" });
  } catch {
    res.status(503).json({ error: "Scraper servis nije dostupan" });
  }
});
