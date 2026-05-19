import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Vijesti", slug: "vijesti", color: "#ed1515", sortOrder: 1 },
  { name: "Politika", slug: "politika", color: "#1d4ed8", sortOrder: 2 },
  { name: "Ekonomija", slug: "ekonomija", color: "#15803d", sortOrder: 3 },
  { name: "Sport", slug: "sport", color: "#d97706", sortOrder: 4 },
  { name: "Kultura", slug: "kultura", color: "#7c3aed", sortOrder: 5 },
  { name: "Tehnologija", slug: "tehnologija", color: "#0891b2", sortOrder: 6 },
  { name: "Zdravlje", slug: "zdravlje", color: "#dc2626", sortOrder: 7 },
  { name: "Obrazovanje", slug: "obrazovanje", color: "#65a30d", sortOrder: 8 },
  { name: "Regija", slug: "regija", color: "#9333ea", sortOrder: 9 },
  { name: "Svijet", slug: "svijet", color: "#0f766e", sortOrder: 10 },
];

async function seed() {
  console.log("🌱 Pokretanje seed skripte...");

  // Categories
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: cat,
    });
  }
  console.log("✅ Kategorije kreirane");

  // Admin user
  const adminPass = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "AdminK1#2024",
    12
  );
  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@k1.ba" },
    create: {
      name: "K1 Admin",
      email: process.env.ADMIN_EMAIL || "admin@k1.ba",
      password: adminPass,
      role: "ADMIN",
    },
    update: { password: adminPass, role: "ADMIN" },
  });
  console.log("✅ Admin korisnik kreiran");

  // Sample articles
  const vijesti = await prisma.category.findUnique({ where: { slug: "vijesti" } });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  if (vijesti && admin) {
    await prisma.article.upsert({
      where: { slug: "dobrodosli-na-k1ba-news-portal" },
      create: {
        title: "Dobrodošli na K1.ba – Najbrži news portal u BiH",
        slug: "dobrodosli-na-k1ba-news-portal",
        excerpt:
          "K1.ba je moderan, AI-powered news portal koji donosi najsvježije vijesti iz Bosne i Hercegovine i regiona.",
        content:
          "<p>Dobrodošli na <strong>K1.ba</strong>, najbrži i najmoderniji news portal u Bosni i Hercegovini.</p><p>Naš portal koristi najsavremenije AI tehnologije za automatsko prikupljanje i obradu vijesti, osiguravajući da uvijek imate pristup najsvježijim informacijama.</p><h2>Šta nudimo</h2><ul><li>Vijesti iz BiH i regiona u realnom vremenu</li><li>AI-obrađen i SEO optimizovan sadržaj</li><li>Komentare i interakciju zajednice</li><li>Personalizovano iskustvo čitanja</li></ul><p>Ostanite informisani sa K1.ba!</p>",
        categoryId: vijesti.id,
        authorId: admin.id,
        status: "PUBLISHED",
        isFeatured: true,
        isBreaking: false,
        publishedAt: new Date(),
        readingTime: 2,
        metaTitle: "Dobrodošli na K1.ba – Najbrži news portal u BiH",
        metaDescription: "K1.ba je moderan AI-powered news portal koji donosi najsvježije vijesti iz BiH.",
        metaKeywords: "vijesti, BiH, K1, news portal",
        viewCount: 100,
      },
      update: {},
    });
    console.log("✅ Demo članak kreiran");
  }

  console.log("🎉 Seed završen uspješno!");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
