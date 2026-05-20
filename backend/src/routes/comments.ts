import { Router } from "express";
import { prisma } from "../utils/prisma";
import { authenticate, type AuthRequest } from "../middleware/auth";
import { containsProfanity } from "../utils/profanityFilter";
import type { Response } from "express";

export const commentsRouter = Router();

commentsRouter.get("/", async (req, res) => {
  try {
    const articleId = req.query.articleId as string;
    const page = parseInt(String(req.query.page)) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    if (!articleId) {
      return res.status(400).json({ error: "articleId je obavezan" });
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { articleId, isApproved: true, isDeleted: false, parentId: null },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, image: true } },
          reactions: { select: { type: true, userId: true } },
          replies: {
            where: { isApproved: true, isDeleted: false },
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, image: true } },
              reactions: { select: { type: true, userId: true } },
            },
          },
        },
      }),
      prisma.comment.count({
        where: { articleId, isApproved: true, isDeleted: false, parentId: null },
      }),
    ]);

    res.json({
      data: comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

commentsRouter.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { content, articleId, parentId } = req.body;

    if (!content?.trim() || content.length < 3) {
      return res.status(400).json({ error: "Komentar mora imati najmanje 3 znaka" });
    }

    if (content.length > 2000) {
      return res.status(400).json({ error: "Komentar ne smije biti duži od 2000 znakova" });
    }

    if (containsProfanity(content)) {
      return res.status(400).json({ error: "Komentar sadrži nedozvoljene riječi" });
    }

    // Verify article exists
    const article = await prisma.article.findFirst({
      where: { id: articleId, status: "PUBLISHED" },
    });
    if (!article) return res.status(404).json({ error: "Vijest nije pronađena" });

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        articleId,
        authorId: req.user!.id,
        parentId: parentId || null,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        reactions: true,
        replies: { include: { author: { select: { id: true, name: true, image: true } } } },
      },
    });

    res.status(201).json(comment);
  } catch {
    res.status(500).json({ error: "Greška pri objavljivanju komentara" });
  }
});

commentsRouter.post("/:id/react", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.body;
    const validTypes = ["LIKE", "DISLIKE"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: "Nevažeći tip reakcije" });
    }

    const commentId = String(req.params.id);
    const existing = await prisma.commentReaction.findUnique({
      where: { commentId_userId: { commentId, userId: req.user!.id } },
    });

    if (existing) {
      if (existing.type === type) {
        await prisma.commentReaction.delete({
          where: { commentId_userId: { commentId, userId: req.user!.id } },
        });
      } else {
        await prisma.commentReaction.update({
          where: { commentId_userId: { commentId, userId: req.user!.id } },
          data: { type },
        });
      }
    } else {
      await prisma.commentReaction.create({
        data: { commentId, userId: req.user!.id, type },
      });
    }

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});

commentsRouter.post("/:id/report", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const reportCommentId = String(req.params.id);
    await prisma.$transaction([
      prisma.report.create({
        data: { commentId: reportCommentId, userId: req.user!.id, reason: String(reason || "spam") },
      }),
      prisma.comment.update({
        where: { id: reportCommentId },
        data: { reportCount: { increment: 1 } },
      }),
    ]);
    res.json({ message: "Komentar je prijavljen" });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});
