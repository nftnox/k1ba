import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error & { status?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status = err.status || 500;

  if (process.env.NODE_ENV !== "production") {
    console.error(`[ERROR] ${status}: ${err.message}`);
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Zapis nije pronađen" });
  }

  if (err.code === "P2002") {
    return res.status(409).json({ error: "Zapis već postoji" });
  }

  res.status(status).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Greška servera"
        : err.message,
  });
}
