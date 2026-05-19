import { NextResponse } from "next/server";
import { articlesAPI } from "@/lib/api";
import { getImageUrl } from "@/lib/utils";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://k1.ba";
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "K1.ba";

  let articles: any[] = [];
  try {
    const res = await articlesAPI.getAll({ page: 1, limit: 50, sort: "newest" });
    articles = res.data;
  } catch {}

  const items = articles
    .map(
      (article) => `
    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${appUrl}/vijest/${article.slug}</link>
      <guid isPermaLink="true">${appUrl}/vijest/${article.slug}</guid>
      <description><![CDATA[${article.excerpt}]]></description>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      <category><![CDATA[${article.category.name}]]></category>
      ${article.featuredImage ? `<enclosure url="${getImageUrl(article.featuredImage)}" type="image/webp" />` : ""}
    </item>`
    )
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${appName} â€“ Vijesti</title>
    <link>${appUrl}</link>
    <description>NajbrĹľi news portal u Bosni i Hercegovini</description>
    <language>bs</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${appUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <managingEditor>redakcija@k1.ba (K1 Redakcija)</managingEditor>
    <webMaster>tech@k1.ba</webMaster>
    <image>
      <url>${appUrl}/logo.png</url>
      <title>${appName}</title>
      <link>${appUrl}</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=1800, stale-while-revalidate=3600",
    },
  });
}
