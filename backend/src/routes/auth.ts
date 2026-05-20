import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import type { Request, Response } from "express";

export const authRouter = Router();

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Sva polja su obavezna" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Lozinka mora imati najmanje 8 znakova" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email je već u upotrebi" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, image: true, role: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" } as any
    );

    res.status(201).json({ token, user });
  } catch {
    res.status(500).json({ error: "Greška pri registraciji" });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email i lozinka su obavezni" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        image: true,
        role: true,
        isBanned: true,
        isActive: true,
      },
    });

    if (!user || !user.password) {
      return res.status(401).json({ error: "Pogrešni podaci za prijavu" });
    }

    if (!user.isActive || user.isBanned) {
      return res.status(403).json({ error: "Nalog je blokiran" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Pogrešni podaci za prijavu" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" } as any
    );

    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch {
    res.status(500).json({ error: "Greška pri prijavi" });
  }
});

authRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Niste prijavljeni" });

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, image: true, role: true },
    });

    if (!user) return res.status(404).json({ error: "Korisnik nije pronađen" });
    res.json(user);
  } catch {
    res.status(401).json({ error: "Nevažeći token" });
  }
});
