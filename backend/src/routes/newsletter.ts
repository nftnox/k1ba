import { Router } from "express";
import { prisma } from "../utils/prisma";
import type { Request, Response } from "express";

export const newsletterRouter = Router();

newsletterRouter.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Nevažeći email" });
    }

    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, isActive: true },
      update: { isActive: true },
    });

    res.json({ message: "Uspješno ste se pretplatili!" });
  } catch {
    res.status(500).json({ error: "Greška pri pretplati" });
  }
});

newsletterRouter.post("/unsubscribe", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    await prisma.newsletterSubscriber.updateMany({
      where: { email },
      data: { isActive: false },
    });
    res.json({ message: "Uspješno ste se odjavili" });
  } catch {
    res.status(500).json({ error: "Greška" });
  }
});
