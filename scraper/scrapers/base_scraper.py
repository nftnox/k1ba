"""
Base scraper – robustna osnovna klasa sa anti-blocking mjerama.
- Rotating user agents
- Random delays
- Retry logic
- Graceful error handling
"""
import asyncio
import logging
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime

import feedparser
import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)

# Pool realnih browser User-Agent stringova
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
]

# Referer pool – da izgleda kao da dolazimo sa Google-a ili direktno
REFERERS = [
    "https://www.google.com/",
    "https://www.google.ba/",
    "https://www.bing.com/",
    "",  # direktan pristup
    "",  # direktan pristup (duplo veća šansa)
]


def random_headers() -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "bs-BA,bs;q=0.9,hr;q=0.8,sr;q=0.7,en;q=0.5",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
        **({"Referer": ref} if (ref := random.choice(REFERERS)) else {}),
    }


async def polite_delay(min_s: float = 1.0, max_s: float = 3.5):
    """Random delay između zahtjeva – imituje ljudsko ponašanje."""
    await asyncio.sleep(random.uniform(min_s, max_s))


@dataclass
class ScrapedArticle:
    title: str
    content: str
    excerpt: str
    source_url: str
    source_name: str
    image_url: Optional[str] = None
    published_at: Optional[datetime] = None
    category_hint: Optional[str] = None
    tags: List[str] = field(default_factory=list)


class BaseScraper(ABC):
    def __init__(self, name: str, base_url: str, rss_url: Optional[str] = None):
        self.name = name
        self.base_url = base_url
        self.rss_url = rss_url
        self._consecutive_errors = 0
        self._max_consecutive_errors = 5

    @abstractmethod
    async def get_article_urls(self, limit: int = 20) -> List[str]:
        pass

    @abstractmethod
    async def scrape_article(self, url: str) -> Optional[ScrapedArticle]:
        pass

    async def scrape_all(self, limit: int = 20) -> List[ScrapedArticle]:
        articles = []
        urls = await self.get_article_urls(limit)
        logger.info(f"[{self.name}] Pronađeno {len(urls)} URL-ova")

        self._consecutive_errors = 0

        for url in urls[:limit]:
            # Ako previše grešaka zaredom – pauziraj i nastavi
            if self._consecutive_errors >= self._max_consecutive_errors:
                logger.warning(f"[{self.name}] Previše grešaka – pauza 30s")
                await asyncio.sleep(30)
                self._consecutive_errors = 0

            try:
                article = await self.scrape_article(url)
                if article and article.title and len(article.content) > 100:
                    articles.append(article)
                    self._consecutive_errors = 0
                await polite_delay(1.2, 3.0)
            except Exception as e:
                self._consecutive_errors += 1
                logger.warning(f"[{self.name}] Greška za {url}: {type(e).__name__}")

        logger.info(f"[{self.name}] ✅ Prikupljeno {len(articles)}/{len(urls)} vijesti")
        return articles

    # ─── HTTP helpers ─────────────────────────────────────────────────────

    async def fetch_rss(self) -> List[str]:
        if not self.rss_url:
            return []
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(
                    timeout=20.0,
                    headers=random_headers(),
                    follow_redirects=True,
                ) as client:
                    response = await client.get(self.rss_url)
                    if response.status_code == 200:
                        feed = feedparser.parse(response.text)
                        urls = [
                            entry.link
                            for entry in feed.entries[:30]
                            if hasattr(entry, "link") and entry.link
                        ]
                        logger.debug(f"[{self.name}] RSS: {len(urls)} URL-ova")
                        return urls
                    elif response.status_code == 429:
                        await asyncio.sleep(10 * (attempt + 1))
            except (httpx.TimeoutException, httpx.ConnectError) as e:
                logger.debug(f"[{self.name}] RSS pokušaj {attempt + 1}/3: {e}")
                if attempt < 2:
                    await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"[{self.name}] RSS greška: {e}")
                break
        return []

    async def fetch_html(self, url: str, retries: int = 3) -> Optional[str]:
        for attempt in range(retries):
            try:
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(30.0, connect=10.0),
                    headers=random_headers(),
                    follow_redirects=True,
                ) as client:
                    response = await client.get(url)

                    if response.status_code == 200:
                        return response.text

                    if response.status_code == 429:
                        wait = 15 * (attempt + 1)
                        logger.warning(f"[{self.name}] Rate limited – čekam {wait}s")
                        await asyncio.sleep(wait)
                        continue

                    if response.status_code in (403, 404, 410):
                        return None  # Ne treba retry

                    logger.debug(f"[{self.name}] HTTP {response.status_code} za {url}")

            except httpx.TimeoutException:
                if attempt < retries - 1:
                    await asyncio.sleep(3 * (attempt + 1))
            except httpx.ConnectError:
                if attempt < retries - 1:
                    await asyncio.sleep(5)
            except Exception as e:
                logger.error(f"[{self.name}] fetch_html greška: {e}")
                break

        return None

    # ─── Content extraction helpers ──────────────────────────────────────

    def clean_text(self, text: str) -> str:
        if not text:
            return ""
        import re
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        return text

    def extract_first_image(
        self,
        soup: BeautifulSoup,
        base_url: str = "",
        min_width: int = 200,
    ) -> Optional[str]:
        """Nađi prvu relevantnu sliku – preskači ikonice i logoe."""
        selectors = [
            "meta[property='og:image']",     # OG slika je uvijek glavna
            "article img[src]",
            "figure img[src]",
            ".article-image img[src]",
            ".featured-image img[src]",
            ".post-thumbnail img[src]",
            "img[src]",
        ]

        # Pokušaj OG image prvo
        og = soup.select_one("meta[property='og:image']")
        if og and og.get("content"):
            return og["content"]

        for selector in selectors[1:]:
            for img in soup.select(selector):
                src = img.get("src", "")
                if not src or "logo" in src.lower() or "icon" in src.lower():
                    continue
                # Skip data URIs i trackers
                if src.startswith("data:") or "pixel" in src:
                    continue
                if src.startswith("http"):
                    return src
                if src.startswith("//"):
                    return "https:" + src
                if base_url and src.startswith("/"):
                    return base_url.rstrip("/") + src
        return None

    def extract_content(self, soup: BeautifulSoup, selectors: List[str]) -> str:
        """Izvuci čist tekst iz HTML-a."""
        for selector in selectors:
            el = soup.select_one(selector)
            if not el:
                continue

            # Ukloni nepoželjne elemente
            for unwanted in el.select(
                "script, style, nav, header, footer, .ads, .advertisement, "
                ".social-share, .related, .comments, .sidebar, iframe, "
                ".newsletter, .subscription, [class*='promo'], [class*='banner']"
            ):
                unwanted.decompose()

            paragraphs = el.find_all("p")
            useful = [
                p.get_text(strip=True)
                for p in paragraphs
                if len(p.get_text(strip=True)) > 40
            ]

            if len(useful) >= 2:
                return " ".join(useful)

            # Ako nema paragraf, uzmi sav tekst
            text = el.get_text(separator=" ", strip=True)
            if len(text) > 200:
                return text

        return ""

    def extract_published_date(self, soup: BeautifulSoup) -> Optional[datetime]:
        """Pokušaj pronaći datum objave."""
        import re
        from datetime import timezone

        selectors = [
            "meta[property='article:published_time']",
            "meta[name='publish_date']",
            "time[datetime]",
            "[itemprop='datePublished']",
        ]

        for sel in selectors:
            el = soup.select_one(sel)
            if not el:
                continue
            val = el.get("content") or el.get("datetime") or el.get("itemprops")
            if val:
                try:
                    from dateutil import parser as dp
                    return dp.parse(val)
                except Exception:
                    pass

        return datetime.now(timezone.utc)
