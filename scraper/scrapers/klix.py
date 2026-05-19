"""Klix.ba scraper – koristi RSS feed."""
import logging
from typing import Optional, List
from datetime import datetime
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper, ScrapedArticle

logger = logging.getLogger(__name__)


class KlixScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            name="Klix",
            base_url="https://www.klix.ba",
            rss_url="https://www.klix.ba/rss",
        )

    async def get_article_urls(self, limit: int = 20) -> List[str]:
        urls = await self.fetch_rss()
        if not urls:
            # Fallback to homepage scraping
            html = await self.fetch_html(self.base_url)
            if html:
                soup = BeautifulSoup(html, "lxml")
                links = soup.select("a[href*='/vijesti/'], a[href*='/biznis/'], a[href*='/sport/']")
                seen = set()
                for link in links:
                    href = link.get("href", "")
                    if href.startswith("/"):
                        href = self.base_url + href
                    if href.startswith(self.base_url) and href not in seen and len(href) > 30:
                        urls.append(href)
                        seen.add(href)
        return list(dict.fromkeys(urls))[:limit]

    async def scrape_article(self, url: str) -> Optional[ScrapedArticle]:
        html = await self.fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")

        # Title
        title_el = (
            soup.select_one("h1.article-title")
            or soup.select_one("h1.title")
            or soup.select_one("article h1")
            or soup.select_one("h1")
        )
        if not title_el:
            return None
        title = self.clean_text(title_el.get_text())
        if len(title) < 10:
            return None

        # Content – Klix koristi <div id="text"> za tijelo članka (Tailwind CSS, nema semantičkih klasa)
        content = self.extract_content(
            soup,
            [
                "#text",
                ".article-body",
                ".article-content",
                ".text-holder",
                "[itemprop='articleBody']",
                "article .content",
            ],
        )
        if len(content) < 100:
            return None

        # Image
        image_url = self.extract_first_image(soup, self.base_url)

        # Excerpt from og:description or first paragraph
        og_desc = soup.select_one("meta[property='og:description']")
        excerpt = og_desc["content"] if og_desc else content[:200] + "..."

        # Detect category from URL
        category_hint = "vijesti"
        if "/sport/" in url:
            category_hint = "sport"
        elif "/biznis/" in url:
            category_hint = "ekonomija"
        elif "/politika/" in url:
            category_hint = "politika"

        return ScrapedArticle(
            title=title,
            content=content,
            excerpt=excerpt,
            source_url=url,
            source_name="Klix.ba",
            image_url=image_url,
            published_at=datetime.now(),
            category_hint=category_hint,
        )
