import { NextResponse } from "next/server";
import { articlesAPI, categoriesAPI } from "@/lib/api";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://k1.ba";

  const staticPages = [
    { url: appUrl, changefreq: "hourly", priority: "1.0" },
    { url: `${appUrl}/najnovije`, changefreq: "hourly", priority: "0.9" },
    { url: `${appUrl}/trending`, changefreq: "hourly", priority: "0.8" },
    { url: `${appUrl}/popularno`, changefreq: "daily", priority: "0.7" },
    { url: `${appUrl}/pretraga`, changefreq: "weekly", priority: "0.5" },
  ];

  let categoryPages: string[] = [];
  let articlePages: string[] = [];

  try {
    const categories = await categoriesAPI.getAll();
    categoryPages = categories.map(
      (c) => `<url><loc>${appUrl}/kategorije/${c.slug}</loc><changefreq>hourly</changefreq><priority>0.8</priority></url>`
    );
  } catch {}

  try {
    const res = await articlesAPI.getAll({ page: 1, limit: 100, sort: "newest" });
    articlePages = res.data.map(
      (a) =>
        `<url><loc>${appUrl}/vijest/${a.slug}</loc><lastmod>${new Date(a.updatedAt).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
    );
  } catch {}

  const staticXml = staticPages
    .map(
      (p) =>
        `<url><loc>${p.url}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${categoryPages.join("\n")}
${articlePages.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
