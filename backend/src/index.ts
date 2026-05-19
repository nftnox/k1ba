import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { rateLimit } from "express-rate-limit";
import { articlesRouter } from "./routes/articles";
import { categoriesRouter } from "./routes/categories";
import { commentsRouter } from "./routes/comments";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { searchRouter } from "./routes/search";
import { newsletterRouter } from "./routes/newsletter";
import { mediaRouter } from "./routes/media";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./utils/prisma";

const app = express();
const PORT = process.env.PORT || 8000;

// Security
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Previše zahtjeva. Pokušajte ponovo." },
});
app.use("/api", limiter);

// Parsing
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Logging (only in dev)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Static files (uploaded media)
app.use("/media", express.static(path.join(process.cwd(), "uploads")));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/search", searchRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/media", mediaRouter);
app.use("/api/admin", adminRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start
async function main() {
  try {
    await prisma.$connect();
    console.log("✅ Baza podataka povezana");

    app.listen(PORT, () => {
      console.log(`🚀 Backend server pokrenut na http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Greška pri pokretanju:", error);
    process.exit(1);
  }
}

main();

export default app;
