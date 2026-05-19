from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://k1user:k1pass@localhost:5432/k1news"
    REDIS_URL: str = "redis://localhost:6379"
    BACKEND_URL: str = "http://localhost:8000"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    OLLAMA_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:3b"
    SCRAPER_SECRET: str = "your-scraper-secret"
    SCRAPE_INTERVAL_MINUTES: int = 5
    PORT: int = 8001
    IMAGES_DIR: str = "./media/images"
    MAX_IMAGE_WIDTH: int = 1200
    IMAGE_QUALITY: int = 85
    IMAGE_SERVER_URL: str = "http://localhost:8001"
    UNSPLASH_ACCESS_KEY: str = ""
    GOOGLE_SEARCH_API_KEY: str = ""
    GOOGLE_SEARCH_CX: str = ""

    SOURCES: List[dict] = [
        {
            "name": "Klix",
            "slug": "klix",
            "url": "https://www.klix.ba",
            "rss": "https://www.klix.ba/rss",
            "enabled": True,
        },
        {
            "name": "Avaz",
            "slug": "avaz",
            "url": "https://avaz.ba",
            "rss": "https://avaz.ba/rss",
            "enabled": True,
        },
        {
            "name": "N1 Info",
            "slug": "n1info",
            "url": "https://n1info.ba",
            "rss": "https://n1info.ba/feed",
            "enabled": True,
        },
        {
            "name": "Oslobođenje",
            "slug": "oslobodjenje",
            "url": "https://oslobodjenje.ba",
            "rss": "https://oslobodjenje.ba/rss",
            "enabled": True,
        },
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
