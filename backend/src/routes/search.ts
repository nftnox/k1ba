import { Router } from "express";
import { prisma } from "../utils/prisma";
import { cacheGet, cacheSet } from "../utils/redis";
import type { Request, Response } from "express";

export const searchRouter = Router();

searchRouter.get("/", async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string)?.trim();
    const page = parseInt(String(req.query.page)) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    if (!query || query.length < 2) {
      return res.json({ articles: [], total: 0, query: query || "" });
    }

    const cacheKey = `search:${query}:p${page}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const where = {
      status: "PUBLISHED" as const,
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { excerpt: { contains: query, mode: "insensitive" as const } },
        { content: { contains: query, mode: "insensitive" as const } },
        { metaKeywords: { contains: query, mode: "insensitive" as const } },
      ],
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        include: {
          category: true,
          _count: { select: { comments: true } },
        },
      }),
      prisma.article.count({ where }),
    ]);

    const result = { articles, total, query };
    await cacheSet(cacheKey, result, 300);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Greška pri pretrazi" });
  }
});
