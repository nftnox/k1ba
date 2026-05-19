# K1.ba – AI-Powered News Portal

Moderan, profesionalan news portal za Bosnu i Hercegovinu sa potpuno automatizovanim AI sistemom za prikupljanje i obradu vijesti.

---

## Arhitektura sistema

```
K1/
├── frontend/          # Next.js 15 portal (port 3000)
├── backend/           # Node.js + Express API (port 8000)
├── scraper/           # Python automation engine (port 8001)
├── docker/            # Docker konfiguracije
│   ├── nginx/
│   └── postgres/
├── docker-compose.yml
├── start-local.ps1    # Lokalno pokretanje (Windows)
└── start-docker.ps1   # Docker pokretanje
```

---

## Kako sistem radi

### 1. Scraper Pipeline (automatski, svakih 5 minuta)

```
Klix.ba / Avaz.ba / N1Info / Oslobođenje
       ↓
  RSS Feed + HTML scraping
       ↓
  Duplicate detection (Redis hash check)
       ↓
  AI Rewrite (Ollama lokalno – DeepSeek/Mistral)
       ↓
  Image download + WebP konverzija (Pillow)
       ↓
  SEO generisanje (meta, keywords, tags)
       ↓
  PostgreSQL (auto-publish)
       ↓
  Redis cache invalidacija
       ↓
  Vijest živa na portalu
```

### 2. Frontend arhitektura (Next.js 15)

- **Server Components** za SEO i brzinu
- **Streaming** za brže prikazivanje
- **Redis cache** za smanjenje DB upita
- **Infinite scroll** sa IntersectionObserver
- **Dark/light mode** sa next-themes
- **PWA** podrška

### 3. Backend API (Node.js + Express)

- REST API sa Express-om
- Prisma ORM za PostgreSQL
- JWT autentikacija
- Rate limiting
- Redis caching
- Helmet za security headere

---

## Pokretanje lokalno

### Preduslovi

- Node.js 20+
- Python 3.11+
- Docker Desktop
- Git

### Korak 1 – Kloniraj i instaliraj

```powershell
# U K1/ folderu
cd C:\Users\nordin.hodzic\Desktop\K1

# Pokreni sve odjednom
.\start-local.ps1
```

### Korak 2 – Ručno pokretanje (alternativa)

```powershell
# 1. Pokreni infrastrukturu
docker compose up postgres redis -d

# 2. Backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev

# 3. Frontend (novi terminal)
cd frontend
npm install
npm run dev

# 4. Scraper (novi terminal, Python)
cd scraper
pip install -r requirements.txt
python main.py
```

### Korak 3 – Ollama (lokalni AI)

```bash
# Instaliraj Ollama
# Windows: https://ollama.ai/download

# Preuzmi model (samo jednom, ~4GB)
ollama pull deepseek-r1:7b

# Alternativni modeli (manji)
ollama pull mistral:7b
ollama pull llama3.2:3b
```

---

## Docker pokretanje (preporučeno)

```powershell
# Sve u jednoj komandi
.\start-docker.ps1

# Ili ručno
docker compose up -d

# Preuzmi AI model
docker exec k1_ollama ollama pull deepseek-r1:7b

# Pokreni migracije
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed
```

### Pristup servisima

| Servis | URL |
|--------|-----|
| Portal | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Scraper | http://localhost:8001 |
| Ollama | http://localhost:11434 |
| DB Studio | `npm run db:studio` (u backend/) |

### Admin pristup

- **URL**: http://localhost:3000/admin
- **Email**: admin@k1.ba
- **Lozinka**: AdminK1#2024

---

## Deploying na produkciju

### Option A – Vercel (frontend) + VPS (backend + scraper)

```bash
# Frontend na Vercel
cd frontend
npx vercel --prod

# Backend na VPS
cd backend
npm run build
# Pokreni sa PM2 ili systemd
pm2 start dist/index.js --name k1-backend

# Scraper na VPS
cd scraper
pip install -r requirements.txt
# Pokreni kao systemd service ili screen
python main.py
```

### Option B – Docker na VPS-u

```bash
# Na VPS-u
git clone <repo>
cd K1

# Kopij .env.production → .env, promijeni vrijednosti
cp .env.production .env
nano .env

# Pokreni
docker compose -f docker-compose.yml --profile production up -d

# SSL sa Let's Encrypt
certbot certonly --webroot -w /var/www/certbot -d k1.ba -d www.k1.ba
```

### VPS preporuke

- **Minimalno**: 4 CPU, 8GB RAM, 50GB SSD
- **Za Ollama GPU**: NVIDIA GPU (RTX 3060+) za brži AI
- **OS**: Ubuntu 22.04 LTS
- **Provajderi**: Hetzner, DigitalOcean, Linode

---

## Konfiguracija

### Dodavanje novih izvora za scraping

U `scraper/config/settings.py`:

```python
SOURCES = [
    {
        "name": "MojPortal",
        "slug": "mojportal",
        "url": "https://mojportal.ba",
        "rss": "https://mojportal.ba/rss",
        "enabled": True,
    },
    # ...
]
```

Kreiraj novi fajl `scraper/scrapers/mojportal.py` po uzoru na `klix.py`.

### Promjena AI modela

U `scraper/.env`:

```bash
OLLAMA_MODEL=mistral:7b
# ili
OLLAMA_MODEL=llama3.2:3b
# ili
OLLAMA_MODEL=deepseek-r1:7b
```

### Interval scrapinga

```bash
SCRAPE_INTERVAL_MINUTES=5  # Promijeni po potrebi
```

---

## Baza podataka

### Prisma komande

```bash
cd backend

# Generiši Prisma client
npm run db:generate

# Kreiraj migraciju
npm run db:migrate:dev

# Primijeni migracije (produkcija)
npm run db:migrate

# Seed podatke
npm run db:seed

# DB Studio (vizuelni pregled)
npm run db:studio
```

### Shema baze

- `users` – Korisnici (USER, MODERATOR, ADMIN)
- `articles` – Vijesti sa SEO meta podacima
- `categories` – Kategorije (vijesti, sport, ekonomija...)
- `tags` – Tagovi
- `comments` – Komentari sa hijerarhijom (reply)
- `comment_reactions` – Like/Dislike na komentarima
- `article_reactions` – Reakcije na vijestima
- `article_views` – Praćenje pregleda
- `saved_articles` – Sačuvane vijesti
- `reports` – Prijave neodgovarajućeg sadržaja
- `newsletter_subscribers` – Newsletter pretplatnici
- `scraper_logs` – Logovi automatskog scrapera

---

## SEO

Portal je optimizovan za:

- **Dynamic metadata** – naslov, opis, keywords za svaki članak
- **OpenGraph** – Facebook, LinkedIn dijeljenje
- **Twitter Cards** – Twitter dijeljenje
- **JSON-LD** – NewsArticle, Breadcrumb structured data
- **sitemap.xml** – Auto-generisan na `/sitemap.xml`
- **robots.txt** – Konfigurisan na `/robots.txt`
- **RSS Feed** – Na `/feed.xml`
- **Canonical URLs** – Sprečava duplicate content
- **Reading time** – Auto-izračunato
- **Lazy loading** – Slike se učitavaju po potrebi
- **WebP format** – Automatska konverzija slika

---

## Sigurnost

- **Rate limiting** – Express rate limiter + Nginx
- **JWT autentikacija** – Sigurni tokeni
- **bcrypt** – Hashirane lozinke (12 rounds)
- **Helmet.js** – Security headere
- **CORS** – Konfigurisan za dozvoljene domene
- **Input validacija** – Zod na backendu
- **XSS zaštita** – Sanitizacija komentara
- **SQL Injection** – Prisma ORM sprečava
- **CSRF** – NextAuth CSRF zaštita

---

## Anti-duplicate sistem

Scraper koristi višeslojnu zaštitu od dupliciranja:

1. **URL hash** – MD5 hash source URL-a u Redisu
2. **Title hash** – SHA256 hash normalizovanog naslova
3. **Content hash** – Hash prvih 200 znakova sadržaja
4. **Database check** – `source_hash` kolona u bazi
5. **Similarity check** – SequenceMatcher za sličnost

---

## Troubleshooting

### Backend se ne pokreće

```bash
# Provjeri PostgreSQL
docker compose logs postgres

# Provjeri migracije
cd backend && npx prisma migrate status
```

### Scraper ne radi

```bash
# Provjeri Ollama
curl http://localhost:11434/api/tags

# Provjeri logove
cd scraper && python main.py
```

### Frontend build greška

```bash
cd frontend
npm install --legacy-peer-deps
npm run build
```

---

## Tech Stack

| Komponenta | Tehnologija |
|-----------|-------------|
| Frontend | Next.js 15, TypeScript, TailwindCSS |
| Animacije | Framer Motion |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma 5 |
| Baza | PostgreSQL 16 |
| Cache | Redis 7 |
| AI (lokalni) | Ollama (DeepSeek, Mistral, Llama) |
| Scraper | Python 3.12, Playwright, BeautifulSoup |
| Slike | Pillow (Python), Sharp (Node.js) |
| Auth | NextAuth.js v4 |
| Container | Docker, Docker Compose |
| Web server | Nginx |
| Icons | Lucide React |
| Forms | React Hook Form + Zod |

---

Napravljeno za BiH 🇧🇦 • Powered by AI
