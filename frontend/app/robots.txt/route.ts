import { NextResponse } from "next/server";

export function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://k1.ba";

  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /prijava
Disallow: /registracija

Sitemap: ${appUrl}/sitemap.xml

# AI Crawlers
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /`;

  return new NextResponse(robots, {
    headers: { "Content-Type": "text/plain" },
  });
}
