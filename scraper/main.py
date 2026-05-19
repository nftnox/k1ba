"""
K1.ba Automation Engine – Testni mod: samo Klix, 3 vijesti, sekvencijalno.

Pipeline po vijesti:
1. Scrapaj članak sa Klixa
2. Provjeri duplikat
3. Pošalji Ollami (čeka koliko god treba)
4. Objavi u bazu
5. Pređi na sljedeći
"""
import asyncio
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from fastapi.staticfiles import StaticFiles
import uvicorn

from config.settings import settings
from scrapers.klix import KlixScraper
from scrapers.avaz import AvazScraper
from scrapers.n1info import N1InfoScraper
from scrapers.oslobodjenje import OslobodjenjeScaper
from services.ai_rewrite import ai_service
from services.image_processor import find_and_process_image
from services.publisher import publisher, detect_category
from utils.duplicate_detector import detector

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("k1.scraper")

# ─── Konfiguracija ────────────────────────────────────────────────────────────
# Mijenjaj ovo po potrebi:
ACTIVE_SCRAPERS = [KlixScraper()]   # Samo Klix za sada
ARTICLES_PER_SOURCE = 3             # Broj vijesti po izvoru
# ─────────────────────────────────────────────────────────────────────────────

ALL_SCRAPERS = [
    KlixScraper(),
    AvazScraper(),
    N1InfoScraper(),
    OslobodjenjeScaper(),
]

_scraping_task: Optional[asyncio.Task] = None
_is_running = False


async def _log_to_db(source: str, articles_found: int, articles_processed: int, errors: list, started_at: float, status: str = "SUCCESS"):
    try:
        import asyncpg
        from datetime import timezone
        pool = await asyncpg.create_pool(settings.DATABASE_URL, min_size=1, max_size=2)
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO scraper_logs (id, source, status, articles_found, articles_processed, errors, started_at, completed_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
                """,
                source, status, articles_found, articles_processed,
                errors[:5], datetime.fromtimestamp(started_at, tz=timezone.utc),
            )
        await pool.close()
    except Exception as e:
        logger.debug(f"DB log greška: {e}")


async def process_one_article(article, index: int, total: int, ai_available: bool) -> bool:
    """Obradi jednu vijest: AI rewrite → slika → baza. Vraća True ako je objavljena."""
    label = f"[{index}/{total}]"

    # ── Duplicate check ────────────────────────────────────────────────────
    if detector.is_duplicate(article.title, article.source_url, article.content):
        logger.info(f"  {label} ⏭  Duplikat – preskačem: {article.title[:55]}")
        return False

    category_slug = article.category_hint or detect_category(article.title, article.content)

    # ── AI Rewrite ─────────────────────────────────────────────────────────
    rewritten = None
    if ai_available:
        logger.info(f"  {label} 🤖 Čekam OpenAI... (model: {settings.OPENAI_MODEL})")
        t0 = time.time()
        rewritten = await ai_service.rewrite(article.title, article.content, category_slug)
        elapsed = time.time() - t0
        if rewritten and rewritten.get("ai_processed"):
            logger.info(f"  {label} ✅ OpenAI završio za {elapsed:.1f}s")
        else:
            logger.warning(f"  {label} ⚠️  OpenAI nije vratio rezultat ({elapsed:.1f}s) – koristim original")

    if rewritten and rewritten.get("ai_processed"):
        final_title       = rewritten["title"] or article.title
        final_content     = rewritten["content"]
        final_excerpt     = rewritten["excerpt"]
        meta_description  = rewritten.get("meta_description", "")
        meta_keywords     = rewritten.get("meta_keywords", "")
        tags              = rewritten.get("tags", [])
        ai_processed      = True
        ai_quality        = rewritten.get("ai_quality", 0)
    else:
        final_title       = article.title
        final_content     = "\n".join(
            f"<p>{p.strip()}</p>"
            for p in article.content.split("\n\n")
            if p.strip()
        ) or f"<p>{article.content}</p>"
        final_excerpt     = article.excerpt
        meta_description  = article.excerpt[:160]
        meta_keywords     = ""
        tags              = []
        ai_processed      = False
        ai_quality        = 0

    # ── Slika – tražimo novu, ne kopiramo sa originalnog portala ──────────
    image_url = None
    logger.info(f"  {label} 🖼  Tražim sliku (DuckDuckGo/Wikipedia)...")
    img_result = await find_and_process_image(title=final_title)
    if img_result:
        image_url = img_result["url"]

    # ── Objava u bazu ──────────────────────────────────────────────────────
    logger.info(f"  {label} 💾 Objavljujem u bazu...")
    article_id = await publisher.publish_article(
        title=final_title,
        excerpt=final_excerpt,
        content=final_content,
        featured_image=image_url,
        source_url=article.source_url,
        source_name=article.source_name,
        category_slug=category_slug,
        meta_title=final_title,
        meta_description=meta_description,
        meta_keywords=meta_keywords,
        tags=tags,
        ai_processed=ai_processed,
        ai_quality=ai_quality,
    )

    if article_id:
        detector.mark_seen(article.title, article.source_url)
        logger.info(f"  {label} 🟢 OBJAVLJENO: {final_title[:65]}")
        return True
    else:
        logger.info(f"  {label} 🔴 Nije objavljeno (duplikat u bazi ili greška)")
        return False


async def run_scraping_cycle():
    global _is_running
    if _is_running:
        logger.info("Scraping već u toku – preskačem poziv")
        return

    _is_running = True
    start = time.time()
    total_published = 0
    all_errors = []

    try:
        await publisher.connect()

        ai_available = await ai_service.is_available()
        if ai_available:
            logger.info(f"🤖 OpenAI dostupan – model: {settings.OPENAI_MODEL}")
        else:
            logger.warning("⚠️  OpenAI NIJE dostupan – vijesti se objavljuju bez AI-a")

        for scraper in ACTIVE_SCRAPERS:
            logger.info(f"\n{'─'*55}")
            logger.info(f"📡 Scraping: {scraper.name}  (limit: {ARTICLES_PER_SOURCE})")
            logger.info(f"{'─'*55}")

            try:
                # ── Prikupi URL-ove ────────────────────────────────────────
                logger.info(f"  Čitam RSS feed...")
                urls = await scraper.get_article_urls(limit=ARTICLES_PER_SOURCE)
                logger.info(f"  Pronađeno {len(urls)} URL-ova")

                # ── Scrapaj i obradi jednu po jednu ───────────────────────
                scraped = 0
                for i, url in enumerate(urls[:ARTICLES_PER_SOURCE], 1):
                    logger.info(f"\n  [{i}/{len(urls[:ARTICLES_PER_SOURCE])}] Scrapam: {url}")
                    article = await scraper.scrape_article(url)

                    if not article or not article.title or len(article.content) < 100:
                        logger.warning(f"  [{i}/{len(urls[:ARTICLES_PER_SOURCE])}] ❌ Scraping neuspješan ili premalo sadržaja")
                        continue

                    scraped += 1
                    logger.info(f"  [{i}/{len(urls[:ARTICLES_PER_SOURCE])}] 📰 Scraped: {article.title[:65]}")
                    logger.info(f"        Sadržaj: {len(article.content)} znakova")

                    published = await process_one_article(
                        article=article,
                        index=i,
                        total=len(urls[:ARTICLES_PER_SOURCE]),
                        ai_available=ai_available,
                    )
                    if published:
                        total_published += 1

                    # Kratka pauza između vijesti (ne blokiramo Ollamu)
                    if i < len(urls[:ARTICLES_PER_SOURCE]):
                        logger.info(f"  Kratka pauza (2s) prije sljedeće vijesti...")
                        await asyncio.sleep(2)

                logger.info(f"\n  ✅ {scraper.name}: scraped {scraped}, objavljeno {total_published}")

            except Exception as e:
                msg = f"Greška scraper-a {scraper.name}: {e}"
                logger.error(msg)
                all_errors.append(msg)

    finally:
        _is_running = False
        elapsed = time.time() - start
        logger.info(f"\n{'='*55}")
        logger.info(f"🏁 Ciklus završen za {elapsed:.1f}s")
        logger.info(f"   Ukupno objavljeno: {total_published} vijesti")
        logger.info(f"{'='*55}\n")

        await _log_to_db(
            source=", ".join(s.name for s in ACTIVE_SCRAPERS),
            articles_found=ARTICLES_PER_SOURCE * len(ACTIVE_SCRAPERS),
            articles_processed=total_published,
            errors=all_errors,
            started_at=start,
            status="SUCCESS" if not all_errors else "FAILED",
        )


async def scheduled_scraper():
    interval = settings.SCRAPE_INTERVAL_MINUTES * 60
    logger.info(f"⏰ Automatski scraper startovan (interval: {settings.SCRAPE_INTERVAL_MINUTES} min)")
    while True:
        try:
            await run_scraping_cycle()
        except Exception as e:
            logger.error(f"Kritična greška u ciklusu: {e}")
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scraping_task
    await publisher.connect()
    _scraping_task = asyncio.create_task(scheduled_scraper())
    logger.info("🚀 K1 Scraper pokrenut")
    logger.info(f"   Aktivni izvori: {[s.name for s in ACTIVE_SCRAPERS]}")
    logger.info(f"   Vijesti po izvoru: {ARTICLES_PER_SOURCE}")
    yield
    if _scraping_task:
        _scraping_task.cancel()
    await publisher.disconnect()


app = FastAPI(
    title="K1 Scraper Service",
    description="Automatski news prikupljač za K1.ba",
    version="1.0.0",
    lifespan=lifespan,
)

# Serviramo lokalno snimljene slike – pristupno na /media/images/...
_media_root = Path(settings.IMAGES_DIR).parent  # ./media/images → ./media
_media_root.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(_media_root)), name="media")


@app.get("/health")
async def health():
    ai_ok = await ai_service.is_available()
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "scraping_running": _is_running,
        "ai_available": ai_ok,
        "active_sources": [s.name for s in ACTIVE_SCRAPERS],
        "articles_per_source": ARTICLES_PER_SOURCE,
    }


@app.post("/api/scrape/trigger")
async def trigger_scrape(
    background_tasks: BackgroundTasks,
    x_secret: Optional[str] = Header(None),
):
    if x_secret != settings.SCRAPER_SECRET:
        raise HTTPException(status_code=403, detail="Pristup odbijen")
    if _is_running:
        return {"message": "Scraping već u toku"}
    background_tasks.add_task(run_scraping_cycle)
    return {"message": "Scraping pokrenut"}


@app.get("/api/status")
async def get_status():
    return {
        "is_running": _is_running,
        "active_sources": [{"name": s.name, "url": s.base_url} for s in ACTIVE_SCRAPERS],
        "all_sources": [{"name": s.name, "url": s.base_url} for s in ALL_SCRAPERS],
        "articles_per_source": ARTICLES_PER_SOURCE,
        "interval_minutes": settings.SCRAPE_INTERVAL_MINUTES,
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=False,
        log_level="info",
    )
