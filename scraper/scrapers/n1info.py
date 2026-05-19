"""N1Info.ba scraper."""
import logging
from typing import Optional, List
from datetime import datetime
from bs4 import BeautifulSoup
from .base_scraper import BaseScraper, ScrapedArticle

logger = logging.getLogger(__name__)


class N1InfoScraper(BaseScraper):
    def __init__(self):
        super().__init__(
            name="N1Info",
            base_url="https://n1info.ba",
            rss_url="https://n1info.ba/feed",
        )

    async def get_article_urls(self, limit: int = 20) -> List[str]:
        urls = await self.fetch_rss()
        return list(dict.fromkeys(urls))[:limit]

    async def scrape_article(self, url: str) -> Optional[ScrapedArticle]:
        html = await self.fetch_html(url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")

        # N1Info: h1 ima data-testid="article-main-title"
        title_el = (
            soup.select_one("h1[data-testid='article-main-title']")
            or soup.select_one("h1")
        )
        if not title_el:
            return None

        title = self.clean_text(title_el.get_text())
        if len(title) < 10:
            return None

        # N1Info: sadržaj je raspoređen u više .article-content-wrapper divova
        content = self._extract_n1_content(soup)
        if len(content) < 100:
            return None

        image_url = self.extract_first_image(soup, self.base_url)

        og_desc = soup.select_one("meta[property='og:description']")
        excerpt = og_desc["content"] if og_desc else content[:200] + "..."

        category_hint = "vijesti"
        if "/sport/" in url:
            category_hint = "sport"
        elif "/ekonomija/" in url or "/biznis/" in url:
            category_hint = "ekonomija"
        elif "/regija/" in url or "/region/" in url:
            category_hint = "region"

        return ScrapedArticle(
            title=title,
            content=content,
            excerpt=excerpt,
            source_url=url,
            source_name="N1 Info",
            image_url=image_url,
            published_at=datetime.now(),
            category_hint=category_hint,
        )

    def _extract_n1_content(self, soup: BeautifulSoup) -> str:
        """N1Info dijeli tekst po blokovima; skuplja sve .article-content-wrapper paragrafe."""
        wrappers = soup.select(".article-content-wrapper")
        if wrappers:
            paragraphs = []
            for wrapper in wrappers:
                for unwanted in wrapper.select("script, style, .ads, iframe"):
                    unwanted.decompose()
                for p in wrapper.find_all("p"):
                    text = p.get_text(strip=True)
                    if len(text) > 40:
                        paragraphs.append(text)
            if paragraphs:
                return " ".join(paragraphs)

        # Fallback na standardne selektore
        return self.extract_content(
            soup,
            [".rich-text-block", ".entry-content", ".post-content", "article .content"],
        )
