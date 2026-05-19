"""
AI Rewrite Service – OpenAI GPT-4o mini.
Parafrazira vijest na bosanskom, zadržava sve detalje.
"""
import json
import logging
from typing import Optional
from openai import AsyncOpenAI, APIError, APITimeoutError
from config.settings import settings

logger = logging.getLogger(__name__)

# ─── Prompts ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
Ti si iskusni novinar K1.ba portala u Bosni i Hercegovini.

Tvoj zadatak je da PREPIŠEŠ vijest vlastitim riječima na bosanskom jeziku.

OBAVEZNO:
- Zadrži SVE važne činjenice, brojke, datume, imena i citate – ništa ne izostavljaj
- Nemoj SAŽIMATI – piši isti nivo detalja kao original, samo drugačijim riječima
- Uvod: jedna konkretna, udarna rečenica koja odmah daje suštinu vijesti
- Tijelo: rasporedi sve informacije u 3–4 kratka paragrafa, logičnim redoslijedom
- Naslov: informativan, max 75 znakova, bez clickbaita i bez upitnika
- Ton: novinarski, aktivan glas, bez klišeja, bez AI fraza poput "u zaključku" ili "vrijedi napomenuti"
- Jezik: bosanski standardni

Vrati ISKLJUČIVO validan JSON objekat, bez ikakvog teksta izvan JSON-a.\
"""

USER_TEMPLATE = """\
Naslov: {title}
Kategorija: {category}

Originalni tekst:
{content}

Vrati JSON sa tačno ovim poljima:
{{
  "title": "novi naslov (max 75 znakova)",
  "intro": "jedna uvodna rečenica koja odmah daje suštinu",
  "body": "<p>paragraf 1 sa svim detaljima</p>\\n<p>paragraf 2</p>\\n<p>paragraf 3</p>",
  "excerpt": "sažetak od 1-2 rečenice za preview karticu",
  "meta_description": "SEO opis max 155 znakova koji privlači klikove",
  "meta_keywords": "ključna1, ključna2, ključna3, ključna4",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "summary": "jedna rečenica – srž vijesti"
}}\
"""

# ─── Service ──────────────────────────────────────────────────────────────────


class AIRewriteService:
    def __init__(self):
        self.model = settings.OPENAI_MODEL
        self._client: Optional[AsyncOpenAI] = None

    def _get_client(self) -> AsyncOpenAI:
        if not self._client:
            if not settings.OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY nije postavljen u .env fajlu")
            self._client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                timeout=60.0,
                max_retries=2,
            )
        return self._client

    # ── Public API ────────────────────────────────────────────────────────────

    async def rewrite(
        self,
        title: str,
        content: str,
        category: str = "vijesti",
    ) -> Optional[dict]:
        try:
            result = await self._call_openai(title, content, category)
            if not result:
                return self._fallback(title, content)
            result["ai_processed"] = True
            result["ai_quality"] = self._quality_score(result)
            return result
        except Exception as e:
            logger.error(f"AI rewrite greška: {e}")
            return self._fallback(title, content)

    async def is_available(self) -> bool:
        try:
            client = self._get_client()
            # Provjeri API ključ minimalnim pozivom
            await client.models.retrieve("gpt-4o-mini")
            return True
        except Exception as e:
            logger.warning(f"OpenAI nije dostupan: {e}")
            return False

    # ── Core call ─────────────────────────────────────────────────────────────

    async def _call_openai(
        self,
        title: str,
        content: str,
        category: str,
    ) -> Optional[dict]:
        user_msg = USER_TEMPLATE.format(
            title=title,
            category=category,
            content=content[:3000],  # GPT-4o-mini prima puno više tokena, koristimo više sadržaja
        )

        try:
            client = self._get_client()
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user",   "content": user_msg},
                ],
                response_format={"type": "json_object"},  # Garantuje validan JSON
                temperature=0.6,
                max_tokens=1200,
            )

            raw = response.choices[0].message.content or ""
            logger.debug(f"OpenAI odgovor ({len(raw)} znakova, "
                         f"tokeni: {response.usage.total_tokens})")

            data = json.loads(raw)
            return self._assemble(data)

        except APITimeoutError:
            logger.warning("OpenAI timeout (60s) – koristim original")
            return None
        except APIError as e:
            logger.error(f"OpenAI API greška [{e.status_code}]: {e.message}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"OpenAI vratio nevalidan JSON: {e}")
            return None

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _assemble(self, data: dict) -> dict:
        intro = data.get("intro", "").strip()
        body  = data.get("body",  "").strip()

        parts = []
        if intro:
            parts.append(f"<p><strong>{intro}</strong></p>")
        if body:
            if not body.startswith("<"):
                paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
                body = "\n".join(f"<p>{p}</p>" for p in paragraphs)
            parts.append(body)

        return {
            "title":            data.get("title", "").strip(),
            "content":          "\n".join(parts),
            "excerpt":          data.get("excerpt", "").strip(),
            "meta_description": data.get("meta_description", "")[:160].strip(),
            "meta_keywords":    data.get("meta_keywords", "").strip(),
            "tags":             [str(t) for t in data.get("tags", [])][:5],
            "summary":          data.get("summary", "").strip(),
        }

    def _quality_score(self, data: dict) -> int:
        score = 0
        if len(data.get("title", "")) > 20:        score += 20
        if len(data.get("content", "")) > 300:     score += 30
        if len(data.get("excerpt", "")) > 50:      score += 15
        if len(data.get("meta_description", "")) > 80: score += 15
        if len(data.get("tags", [])) >= 3:         score += 10
        if data.get("summary"):                    score += 10
        return score

    def _fallback(self, title: str, content: str) -> dict:
        excerpt = content[:200].strip() + "..."
        return {
            "title":   title,
            "content": "\n".join(
                f"<p>{p.strip()}</p>"
                for p in content.split("\n\n") if p.strip()
            ) or f"<p>{content}</p>",
            "excerpt":          excerpt,
            "meta_description": excerpt[:155],
            "meta_keywords":    "",
            "tags":             [],
            "summary":          "",
            "ai_processed":     False,
            "ai_quality":       0,
        }


ai_service = AIRewriteService()
