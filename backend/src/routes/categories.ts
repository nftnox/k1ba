import { Router } from "express";
import { prisma } from "../utils/prisma";
import { cacheGet, cacheSet } from "../utils/redis";
import type { Request, Response } from "express";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const cached = await cacheGet("categories:all");
    if (cached) return res.json(cached);

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: { articles: { where: { status: "PUBLISHED" } } },
        },
      },
    });

    await cacheSet("categories:all", categories, 3600);
    res.json(categories);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

categoriesRouter.get("/:slug", async (req: Request, res: Response) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        _count: {
          select: { articles: { where: { status: "PUBLISHED" } } },
        },
      },
    });

    if (!category) return res.status(404).json({ error: "Kategorija nije pronađena" });
    res.json(category);
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});
