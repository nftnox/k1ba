import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { authenticate, requireModerator, type AuthRequest } from "../middleware/auth";
import type { Response } from "express";

export const mediaRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const SIZES = {
  thumbnail: { width: 400, height: 225 },
  medium: { width: 800, height: 450 },
  large: { width: 1200, height: 675 },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

mediaRouter.post(
  "/upload",
  authenticate,
  requireModerator,
  upload.single("image"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Slika nije priložena" });
      }

      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      await fs.mkdir(path.join(UPLOADS_DIR, "thumbnails"), { recursive: true });

      const id = uuidv4();
      const filename = `${id}.webp`;
      const thumbFilename = `${id}-thumb.webp`;

      await sharp(req.file.buffer)
        .resize(SIZES.large.width, SIZES.large.height, { fit: "cover" })
        .webp({ quality: 85 })
        .toFile(path.join(UPLOADS_DIR, filename));

      await sharp(req.file.buffer)
        .resize(SIZES.thumbnail.width, SIZES.thumbnail.height, { fit: "cover" })
        .webp({ quality: 75 })
        .toFile(path.join(UPLOADS_DIR, "thumbnails", thumbFilename));

      const baseUrl = process.env.BACKEND_API_URL || "http://localhost:8000";
      res.json({
        url: `${baseUrl}/media/${filename}`,
        thumbnail: `${baseUrl}/media/thumbnails/${thumbFilename}`,
        filename,
      });
    } catch {
      res.status(500).json({ error: "Greška pri uploadu" });
    }
  }
);
