"""
Image processing service – download, compress, WebP konverzija.

Strategija za slike (bez kopiranja sa originalnih portala):
  1. DuckDuckGo Images  – pravi web rezultati, bez API ključa, bez registracije
  2. Wikipedia API      – za poznate ličnosti (besplatno, bez API ključa)
  3. Unsplash API       – stock foto fallback (treba UNSPLASH_ACCESS_KEY)
  4. None               – članak se objavljuje bez slike
"""
import asyncio
import hashlib
import logging
import re
from pathlib import Path
from typing import Optional
import httpx
from PIL import Image, ImageOps
import io
from config.settings import settings

logger = logging.getLogger(__name__)

IMAGES_DIR = Path(settings.IMAGES_DIR)
THUMBNAILS_DIR = IMAGES_DIR / "thumbnails"

_IMG_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Referer": "https://www.google.com/",
}

SIZES = {"large": (1200, 675), "thumbnail": (400, 225)}

# ─── BCS keyword ekstrakcija ──────────────────────────────────────────────────

_STOPWORDS = {
    "u", "i", "na", "za", "od", "do", "se", "je", "su", "da", "ne",
    "o", "iz", "s", "sa", "k", "ka", "po", "pri", "bez", "nad", "pod",
    "a", "ali", "ili", "te", "ni", "bi", "li", "pa", "to", "ta", "ti",
    "koji", "koja", "koje", "ovaj", "ova", "ovo", "taj", "bio", "bila",
    "ima", "nema", "kao", "ako", "jer", "dok", "što", "šta", "kako",
    "gdje", "kada", "zbog", "kroz", "između", "nakon", "prije",
    "svog", "svoju", "svoja", "njega", "njemu", "njen", "njena",
    "njegovo", "njegova", "njihov", "nove", "novi", "nova", "novo",
    "prvi", "prva", "prvo", "više", "već", "samo", "još", "čak",
    "međutim", "navodi", "kaže", "tvrdi", "objavio", "objavila",
    "miliona", "milijardi", "hiljada", "posto", "procenta", "eura",
    "dolara", "km", "kuna", "dinara", "maraka", "godinu", "godina",
    "jedan", "jedna", "dva", "dvije", "tri", "četiri", "pet", "šest",
    "sedam", "osam", "devet", "deset", "sati", "dana", "metara",
}

_GENITIVE_SUFFIXES = ["jevića", "ovića", "evića", "ovima", "evima",
                      "jem", "oga", "ega", "om", "em", "og", "eg",
                      "ja", "ju", "ji"]

# Transliteracija BCS dijakritika → ASCII (za web pretragu)
_BCS_ASCII = str.maketrans("čćšžČĆŠŽ", "ccszCCSZ")


def _clean_for_search(text: str) -> str:
    """
    Transliterira BCS dijakritike na ASCII za web pretragu.
    NE mijenja oblike riječi – DuckDuckGo razumije i "Wimbledonu".

    Primjeri:
      "Đoković Wimbledonu"  → "Djokovic Wimbledonu"
      "Tysona Furyja"       → "Tysona Furyja"  (DDG to razumije)
    """
    result = text.replace("Đ", "Dj").replace("đ", "dj")
    return result.translate(_BCS_ASCII)


def _normalize_bcs_name(word: str) -> str:
    """
    Uklanja BCS genitivne nastavke da bi se dobio nominativ.
    Namjerno NE uklanja golo '-a' jer kvari strana imena: Guardiola, Obama, Messi.

    Primjeri koji rade:  Furyja→Fury, Đokovića→Đoković, Bidenu→Biden
    Primjeri koji ostaju: Guardiola, Obama, Tysona (Wikipedia to razumije)
    """
    for suffix in sorted(_GENITIVE_SUFFIXES, key=len, reverse=True):
        if len(word) - len(suffix) >= 3 and word.lower().endswith(suffix):
            return word[: -len(suffix)]
    return word


def _extract_person_name(title: str) -> Optional[str]:
    """
    Detektuje par 'Ime Prezime' (dva uzastopna capitalized tokena).
    Normalizuje BCS genitiv: 'Tysona Furyja' → 'Tyson Fury'

    Pretražuje od pozicije 0 da bi uhvatilo i 'Novak Đoković pobijedio...'
    """
    tokens = re.sub(r'["\',!?:;()\[\]{}\-–—]', " ", title).split()
    i = 0
    while i < len(tokens) - 1:
        w1 = tokens[i].strip(".")
        w2 = tokens[i + 1].strip(".")
        if (len(w1) > 2 and w1[0].isupper() and w1.lower() not in _STOPWORDS and
                len(w2) > 2 and w2[0].isupper() and w2.lower() not in _STOPWORDS):
            name = f"{_normalize_bcs_name(w1)} {_normalize_bcs_name(w2)}"
            logger.debug(f"Detektovana osoba/entitet: '{w1} {w2}' → '{name}'")
            return name
        i += 1
    return None


def extract_keywords(title: str, max_words: int = 3) -> str:
    """Ključne riječi za pretragu – ukloni BCS stop wordove, prioritizuj vlastita imena."""
    clean = re.sub(r'["\',!?:;()\[\]{}\-–—]', " ", title)
    candidates = []
    for i, word in enumerate(clean.split()):
        w = word.strip(".")
        if len(w) < 3 or w.lower() in _STOPWORDS or re.match(r'^\d+$', w):
            continue
        candidates.append((w, i))
    proper = [w for w, i in candidates if i > 0 and w[0].isupper()]
    common = [w for w, i in candidates if not (i > 0 and w[0].isupper())]
    return " ".join((proper + common)[:max_words])


# ─── Glavni API ───────────────────────────────────────────────────────────────

async def ensure_dirs():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)


async def find_and_process_image(title: str) -> Optional[dict]:
    """
    Traži relevantnu sliku za naslov članka i procesira je.
    NE koristi originalne slike s portala (copyright).
    Redoslijed: DuckDuckGo → Wikipedia → Unsplash → None
    """
    if not title:
        return None

    await ensure_dirs()

    # Cache ključ baziran na naslovu
    url_hash = hashlib.md5(f"search:{title}".encode()).hexdigest()
    filename = f"{url_hash}.webp"
    thumb_filename = f"{url_hash}-thumb.webp"
    filepath = IMAGES_DIR / filename
    thumb_filepath = THUMBNAILS_DIR / thumb_filename

    if filepath.exists() and thumb_filepath.exists():
        img_server = settings.IMAGE_SERVER_URL
        return {
            "url": f"{img_server}/media/images/{filename}",
            "thumbnail": f"{img_server}/media/images/thumbnails/{thumb_filename}",
            "local_path": str(filepath),
        }

    logger.info(f"🔍 Tražim sliku za: '{title[:60]}'")
    image_url = await _search_image(title)

    if not image_url:
        logger.warning(f"Slika nije pronađena za: '{title[:60]}'")
        return None

    img_data = await _download_image(image_url)
    if not img_data:
        return None

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, _process_and_save, img_data, filepath, thumb_filepath
        )
    except Exception as e:
        logger.error(f"Image processing greška: {e}")
        return None

    img_server = settings.IMAGE_SERVER_URL
    return {
        "url": f"{img_server}/media/images/{filename}",
        "thumbnail": f"{img_server}/media/images/thumbnails/{thumb_filename}",
        "local_path": str(filepath),
    }


# ─── Pretraga slika ───────────────────────────────────────────────────────────

async def _search_image(title: str) -> Optional[str]:
    """Redoslijed pretrage: DuckDuckGo → Wikipedia → Unsplash."""

    raw_keywords = extract_keywords(title, max_words=3)
    search_query = _clean_for_search(raw_keywords)  # BCS→ASCII, padeži→nominativ

    # 1. DuckDuckGo – pravi web rezultati, bez API ključa
    if search_query:
        url = await _fetch_ddg_image(search_query)
        if url:
            logger.info(f"✅ DuckDuckGo: '{search_query}' → {url[:60]}")
            return url

    # 2. Wikipedia – za poznate osobe/mjesta
    person = _extract_person_name(title)
    if person:
        person_ascii = _clean_for_search(person)
        url = await _fetch_wikipedia_image(person_ascii)
        if url:
            logger.info(f"✅ Wikipedia: '{person_ascii}' → {url[:60]}")
            return url

    # 3. Unsplash fallback (ako je ključ konfigurisan)
    if settings.UNSPLASH_ACCESS_KEY and search_query:
        url = await _fetch_unsplash_url(search_query)
        if url:
            logger.info(f"✅ Unsplash: '{search_query}' → {url[:60]}")
            return url

    return None


def _ddg_search_sync(query: str) -> Optional[str]:
    """Sinhrona DuckDuckGo pretraga – pokreće se u thread executor-u."""
    import time
    for attempt in range(2):
        try:
            from ddgs import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.images(
                    query,          # pozicijski – API 8.x preimenova keywords → query
                    max_results=5,
                    size="Large",
                    type_image="photo",
                ))
            for r in results:
                img_url = r.get("image", "")
                if (img_url
                        and not img_url.lower().endswith((".svg", ".gif"))
                        and "logo" not in img_url.lower()):
                    return img_url
            return None  # rezultati pronađeni ali nijedan ne odgovara
        except Exception as e:
            err = str(e)
            if "Ratelimit" in err and attempt == 0:
                logger.warning(f"DuckDuckGo rate limit – čekam 3s i pokusavam ponovo")
                time.sleep(3)
            else:
                logger.warning(f"DuckDuckGo greška [{type(e).__name__}]: {err[:100]}")
                return None
    return None


async def _fetch_ddg_image(query: str) -> Optional[str]:
    """Async wrapper za DuckDuckGo image pretragu."""
    try:
        loop = asyncio.get_event_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _ddg_search_sync, query),
            timeout=20.0,
        )
        return result
    except asyncio.TimeoutError:
        logger.warning(f"DuckDuckGo timeout za: '{query}'")
        return None
    except Exception as e:
        logger.debug(f"DuckDuckGo async greška: {e}")
        return None


async def _fetch_wikipedia_image(person_name: str) -> Optional[str]:
    """Wikipedia Pageimages API – slika za poznatu osobu ili mjesto."""
    wiki_title = person_name.replace(" ", "_")
    params = {
        "action": "query",
        "titles": wiki_title,
        "prop": "pageimages",
        "format": "json",
        "pithumbsize": 1200,
        "redirects": 1,
    }
    headers = {"User-Agent": "K1.ba News Portal/1.0 (https://k1.ba)"}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            for lang in ["en", "bs", "hr", "sr"]:
                try:
                    r = await client.get(
                        f"https://{lang}.wikipedia.org/w/api.php",
                        params=params,
                        headers=headers,
                    )
                    if r.status_code != 200:
                        continue
                    pages = r.json().get("query", {}).get("pages", {})
                    for page in pages.values():
                        if page.get("pageid", -1) > 0:
                            src = page.get("thumbnail", {}).get("source")
                            if src and not src.endswith(".svg"):
                                return src
                except Exception:
                    continue
    except Exception as e:
        logger.debug(f"Wikipedia greška za '{person_name}': {e}")
    return None


async def _fetch_unsplash_url(query: str) -> Optional[str]:
    """Unsplash API fallback."""
    if not settings.UNSPLASH_ACCESS_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://api.unsplash.com/search/photos",
                params={"query": query[:80], "per_page": 1, "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY}"},
            )
            if r.status_code != 200:
                return None
            results = r.json().get("results", [])
            return results[0]["urls"]["regular"] if results else None
    except Exception as e:
        logger.debug(f"Unsplash greška: {e}")
        return None


# ─── Download i processing ────────────────────────────────────────────────────

async def _download_image(url: str, retries: int = 2) -> Optional[bytes]:
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(20.0, connect=8.0),
                headers=_IMG_HEADERS,
                follow_redirects=True,
            ) as client:
                r = await client.get(url)
                if r.status_code != 200:
                    return None
                ct = r.headers.get("content-type", "")
                if not (ct.startswith("image/") or len(r.content) > 5000):
                    return None
                return r.content
        except httpx.TimeoutException:
            if attempt < retries - 1:
                await asyncio.sleep(2)
        except Exception as e:
            logger.debug(f"Download pokušaj {attempt + 1}: {e}")
            break
    return None


def _process_and_save(img_data: bytes, filepath: Path, thumb_filepath: Path):
    """Resize i sačuvaj kao WebP (large + thumbnail)."""
    with Image.open(io.BytesIO(img_data)) as img:
        img = ImageOps.exif_transpose(img)

        if img.mode != "RGB":
            if img.mode == "RGBA":
                bg = Image.new("RGB", img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
            elif img.mode == "P":
                img = img.convert("RGBA").convert("RGB")
            else:
                img = img.convert("RGB")

        if img.width < 100 or img.height < 100:
            raise ValueError(f"Slika premala: {img.width}x{img.height}")

        large = img.copy()
        if large.width > settings.MAX_IMAGE_WIDTH:
            ratio = settings.MAX_IMAGE_WIDTH / large.width
            large = large.resize(
                (settings.MAX_IMAGE_WIDTH, int(large.height * ratio)), Image.LANCZOS
            )
        large.save(filepath, "WEBP", quality=settings.IMAGE_QUALITY, method=6)

        tw, th = SIZES["thumbnail"]
        thumb = ImageOps.fit(img.copy(), (tw, th), Image.LANCZOS, centering=(0.5, 0.3))
        thumb.save(thumb_filepath, "WEBP", quality=72, method=6)
