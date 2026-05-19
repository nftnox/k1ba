import hashlib
import re
from difflib import SequenceMatcher
import redis as redis_lib
from config.settings import settings


def normalize_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[čć]', 'c', text)
    text = re.sub(r'š', 's', text)
    text = re.sub(r'ž', 'z', text)
    text = re.sub(r'đ', 'dj', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\w\s]', '', text)
    return text


def compute_hash(title: str, content: str = "") -> str:
    normalized = normalize_text(title) + normalize_text(content[:200])
    return hashlib.sha256(normalized.encode()).hexdigest()


def similarity_score(text1: str, text2: str) -> float:
    return SequenceMatcher(None, normalize_text(text1), normalize_text(text2)).ratio()


class DuplicateDetector:
    def __init__(self):
        try:
            self._redis = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception:
            self._redis = None

    def _redis_key(self, hash_val: str) -> str:
        return f"article_hash:{hash_val}"

    def is_duplicate(self, title: str, source_url: str, content: str = "") -> bool:
        url_hash = hashlib.md5(source_url.encode()).hexdigest()
        title_hash = compute_hash(title, content)

        if self._redis:
            try:
                if self._redis.exists(self._redis_key(url_hash)):
                    return True
                if self._redis.exists(self._redis_key(title_hash)):
                    return True
            except Exception:
                pass

        return False

    def mark_seen(self, title: str, source_url: str, content: str = "", ttl: int = 86400 * 7):
        url_hash = hashlib.md5(source_url.encode()).hexdigest()
        title_hash = compute_hash(title, content)

        if self._redis:
            try:
                self._redis.setex(self._redis_key(url_hash), ttl, "1")
                self._redis.setex(self._redis_key(title_hash), ttl, "1")
            except Exception:
                pass

    def get_content_hash(self, title: str, content: str = "") -> str:
        return compute_hash(title, content)


detector = DuplicateDetector()
