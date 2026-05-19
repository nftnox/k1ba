"""Avaz.ba scraper."""
import logging
from typing import Optional, List
from datetime import datetime
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper, ScrapedArticle

logger = logging.getLogger(__name__)


class AvazScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            name="Avaz",
            base_url="https://avaz.ba",
            rss_url="https://avaz.ba/rss",
        )

    async def get_article_urls(self, limit: int = 20) -> List[str]:
        urls = await self.fetch_rss()
        if not urls:
            html = await self.fetch_html(self.base_url)
            if html:
                soup = BeautifulSoup(html, "lxml")
                seen = set()
                for link in soup.select("a[href]"):
                    href = link.get("href", "")
                    if href.startswith("/"):
                        href = self.base_url + href
                    if (
                        href.startswith(self.base_url)
                        and href not in seen
                        and len(href) > 30
                        and any(seg in href for seg in ["/novosti/", "/sport/", "/biznis/", "/lifestyle/"])
                    ):
                        urls.append(href)
                        seen.add(href)
        return list(dict.fromkeys(urls))[:limit]

    async def scrape_article(self, url: str) -> Optional[ScrapedArticle]:
        html = await self.fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")

        title_el = (
            soup.select_one("h1.title--lg")
            or soup.select_one("h1.article__title")
            or soup.select_one(".article-title h1")
            or soup.select_one("h1")
        )
        if not title_el:
            return None

        title = self.clean_text(title_el.get_text())
        if len(title) < 10:
            return None

        # Avaz koristi class="article-content" za tijelo članka
        content = self.extract_content(
            soup,
            [
                ".article-content",
                ".article__body",
                ".article-body",
                ".article-text",
                "article .text",
            ],
        )
        if len(content) < 100:
            return None

        image_url = self.extract_first_image(soup, self.base_url)

        og_desc = soup.select_one("meta[property='og:description']")
        excerpt = og_desc["content"] if og_desc else content[:200] + "..."

        category_hint = "vijesti"
        if "/sport/" in url:
            category_hint = "sport"
        elif "/biznis/" in url:
            category_hint = "ekonomija"

        return ScrapedArticle(
            title=title,
            content=content,
            excerpt=excerpt,
            source_url=url,
            source_name="Avaz.ba",
            image_url=image_url,
            published_at=datetime.now(),
            category_hint=category_hint,
        )
