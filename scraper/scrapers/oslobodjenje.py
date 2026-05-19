"""Oslobođenje.ba scraper."""
import logging
from typing import Optional, List
from datetime import datetime
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper, ScrapedArticle

logger = logging.getLogger(__name__)


class OslobodjenjeScaper(BaseScraper):
    def __init__(self):
        super().__init__(
            name="Oslobođenje",
            base_url="https://oslobodjenje.ba",
            rss_url="https://oslobodjenje.ba/rss",
        )

    async def get_article_urls(self, limit: int = 20) -> List[str]:
        urls = await self.fetch_rss()
        return list(dict.fromkeys(urls))[:limit]

    async def scrape_article(self, url: str) -> Optional[ScrapedArticle]:
        html = await self.fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")

        title_el = soup.select_one("h1.article-title") or soup.select_one("h1")
        if not title_el:
            return None

        title = self.clean_text(title_el.get_text())
        if len(title) < 10:
            return None

        content = self.extract_content(
            soup,
            [".article-body", ".article-content", ".entry-content"],
        )
        if len(content) < 100:
            return None

        image_url = self.extract_first_image(soup, self.base_url)
        og_desc = soup.select_one("meta[property='og:description']")
        excerpt = og_desc["content"] if og_desc else content[:200] + "..."

        return ScrapedArticle(
            title=title,
            content=content,
            excerpt=excerpt,
            source_url=url,
            source_name="Oslobođenje",
            image_url=image_url,
            published_at=datetime.now(),
            category_hint="vijesti",
        )
