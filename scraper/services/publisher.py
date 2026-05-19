"""
Publisher service – objavljuje obrađene vijesti u bazu podataka.
"""
import hashlib
import logging
import re
from typing import Optional
import asyncpg
from slugify import slugify
from config.settings import settings

logger = logging.getLogger(__name__)

CATEGORY_KEYWORDS = {
    "sport": ["sport", "fudbal", "košarka", "tenis", "atletika", "liga", "utakmica", "golman", "igrač", "trener"],
    "politika": ["vlada", "predsjednik", "ministar", "stranka", "izbori", "parlament", "zakon", "odluka", "entitet"],
    "ekonomija": ["ekonomija", "privreda", "banka", "budžet", "investicija", "firma", "kompanija", "tržište", "cijena", "inflacija"],
    "kultura": ["kultura", "film", "muzika", "pozorište", "knjiga", "izložba", "festival", "umjetnik", "koncert"],
    "tehnologija": ["tehnologija", "tech", "AI", "internet", "aplikacija", "software", "hardware", "startup"],
    "zdravlje": ["zdravlje", "bolnica", "doktor", "lijek", "bolest", "virus", "vakcina", "liječenje"],
    "obrazovanje": ["škola", "fakultet", "student", "profesor", "obrazovanje", "diploma", "matura"],
    "regija": ["hrvatska", "srbija", "crna gora", "makedonija", "slovenija", "region", "balkanski"],
    "svijet": ["USA", "EU", "europa", "amerik", "rusija", "kina", "svjetsk", "internacionalni", "global"],
}


def detect_category(title: str, content: str) -> str:
    text = (title + " " + content[:500]).lower()
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw.lower() in text)
        if score > 0:
            scores[cat] = score
    if scores:
        return max(scores, key=scores.get)
    return "vijesti"


def generate_slug(title: str) -> str:
    base = slugify(title, max_length=100, separator="-", lowercase=True)
    suffix = hashlib.md5(title.encode()).hexdigest()[:8]
    return f"{base}-{suffix}"


def estimate_reading_time(content: str) -> int:
    words = len(re.findall(r'\w+', content))
    return max(1, round(words / 200))


class Publisher:
    def __init__(self):
        self._pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        if not self._pool:
            self._pool = await asyncpg.create_pool(settings.DATABASE_URL, min_size=1, max_size=5)

    async def disconnect(self):
        if self._pool:
            await self._pool.close()

    async def get_or_create_category(self, slug: str) -> Optional[str]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM categories WHERE slug = $1", slug
            )
            return row["id"] if row else None

    async def get_admin_user_id(self) -> Optional[str]:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1"
            )
            return row["id"] if row else None

    async def article_exists(self, source_url: str, title: str) -> bool:
        source_hash = hashlib.md5((source_url + title).encode()).hexdigest()
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT id FROM articles WHERE "sourceHash" = $1', source_hash
            )
            return row is not None

    async def publish_article(
        self,
        title: str,
        excerpt: str,
        content: str,
        featured_image: Optional[str],
        source_url: str,
        source_name: str,
        category_slug: str,
        meta_title: Optional[str] = None,
        meta_description: Optional[str] = None,
        meta_keywords: Optional[str] = None,
        tags: Optional[list] = None,
        ai_processed: bool = False,
        ai_quality: int = 0,
    ) -> Optional[str]:
        await self.connect()

        source_hash = hashlib.md5((source_url + title).encode()).hexdigest()

        # Check duplicate
        if await self.article_exists(source_url, title):
            logger.debug(f"Duplikat preskočen: {title[:50]}")
            return None

        # Get category
        category_id = await self.get_or_create_category(category_slug)
        if not category_id:
            category_id = await self.get_or_create_category("vijesti")
        if not category_id:
            logger.error("Kategorija nije pronađena u bazi")
            return None

        # Get admin user
        author_id = await self.get_admin_user_id()

        slug = generate_slug(title)
        reading_time = estimate_reading_time(content)

        try:
            async with self._pool.acquire() as conn:
                article_id = await conn.fetchval(
                    """
                    INSERT INTO articles (
                        id, slug, title, excerpt, content,
                        "featuredImage", "categoryId", "authorId",
                        status, "isBreaking", "isFeatured",
                        "readingTime", "viewCount",
                        "metaTitle", "metaDescription", "metaKeywords",
                        "sourceUrl", "sourceName", "sourceHash",
                        "aiProcessed", "aiQuality", "publishedAt",
                        "createdAt", "updatedAt"
                    ) VALUES (
                        gen_random_uuid(), $1, $2, $3, $4,
                        $5, $6, $7,
                        'PUBLISHED', false, false,
                        $8, 0,
                        $9, $10, $11,
                        $12, $13, $14,
                        $15, $16, NOW(),
                        NOW(), NOW()
                    )
                    ON CONFLICT (slug) DO NOTHING
                    RETURNING id
                    """,
                    slug, title, excerpt[:500], content,
                    featured_image, category_id, author_id,
                    reading_time,
                    meta_title or title, meta_description or excerpt[:160], meta_keywords or "",
                    source_url, source_name, source_hash,
                    ai_processed, ai_quality,
                )

                if article_id and tags:
                    for tag_name in tags[:5]:
                        tag_slug = slugify(tag_name, max_length=50)
                        tag_id = await conn.fetchval(
                            """
                            INSERT INTO tags (id, name, slug, "createdAt")
                            VALUES (gen_random_uuid(), $1, $2, NOW())
                            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                            RETURNING id
                            """,
                            tag_name, tag_slug
                        )
                        if tag_id:
                            await conn.execute(
                                """
                                INSERT INTO article_tags ("articleId", "tagId")
                                VALUES ($1, $2) ON CONFLICT DO NOTHING
                                """,
                                article_id, tag_id
                            )

                if article_id:
                    logger.info(f"✅ Objavljena vijest: {title[:60]}")
                    return str(article_id)
                return None

        except Exception as e:
            logger.error(f"Greška pri objavljivanju: {e}")
            return None


publisher = Publisher()
