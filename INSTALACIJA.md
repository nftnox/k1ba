# K1.ba – Kompletan vodič za instalaciju i pokretanje

---

## Programi koje trebaš instalirati

### 1. Node.js 20+
**Download:** https://nodejs.org/en/download (odaberi "LTS" verziju)

**Provjera:**
```powershell
node --version   # treba biti v20+
npm --version    # treba biti v10+
```

---

### 2. Python 3.11+
**Download:** https://www.python.org/downloads/

**Važno:** Tokom instalacije, označi ✅ "Add Python to PATH"

**Provjera:**
```powershell
python --version  # treba biti 3.11+
pip --version
```

---

### 3. Docker Desktop
**Download:** https://www.docker.com/products/docker-desktop/

Docker Desktop uključuje:
- Docker Engine
- Docker Compose
- PostgreSQL i Redis (pokrećemo u kontejnerima – ne trebaš ih ručno instalirati!)

**Provjera:**
```powershell
docker --version
docker compose version
```

---

### 4. Ollama (lokalni AI)
**Download:** https://ollama.ai/download

Ollama je lokalni AI server koji pokreće modele na tvojoj mašini.  
**Nema potrebe za OpenAI ili Claude API!**

**Provjera:**
```powershell
ollama --version
```

---

### 5. Git (opcionalno, ali preporučeno)
**Download:** https://git-scm.com/download/win

---

## Redoslijed pokretanja

### Korak 1 – Pokreni infrastrukturu (PostgreSQL + Redis)

```powershell
cd C:\Users\nordin.hodzic\Desktop\K1

# Pokreni samo bazu i Redis (u pozadini)
docker compose up postgres redis -d
```

Čekaj 10 sekundi da se baza inicijalizira.

---

### Korak 2 – Pokreni backend API

Otvori **novi PowerShell prozor**:

```powershell
cd C:\Users\nordin.hodzic\Desktop\K1\backend

# Instaliraj dependencies (samo jednom)
npm install

# Generiši Prisma client
npx prisma generate

# Pokreni migracije (kreira tabele u bazi)
npx prisma migrate dev --name init

# Ubaci početne podatke (kategorije, admin)
npm run db:seed

# Pokreni backend server
npm run dev
```

✅ Backend radi na: **http://localhost:8000**

Provjera: http://localhost:8000/health

---

### Korak 3 – Pokreni Ollama i preuzmi AI model

Otvori **novi PowerShell prozor**:

```powershell
# Pokreni Ollama (pokrenit će se u pozadini automatski nakon instalacije)
# Ako ne radi, pokreni Ollama Desktop aplikaciju

# Preuzmi AI model (samo jednom – ~4GB download)
ollama pull deepseek-r1:7b

# ALTERNATIVA – manji i brži model (preporučeno ako imaš manje od 8GB RAM):
ollama pull mistral:7b

# ALTERNATIVA – najmanji model (~2GB):
ollama pull llama3.2:3b
```

✅ Ollama radi na: **http://localhost:11434**

Provjera:
```powershell
curl http://localhost:11434/api/tags
```

---

### Korak 4 – Pokreni Python Scraper

Otvori **novi PowerShell prozor**:

```powershell
cd C:\Users\nordin.hodzic\Desktop\K1\scraper

# Instaliraj Python dependencies (samo jednom)
pip install -r requirements.txt

# Instaliraj Playwright browsere (za scraping JS stranica)
playwright install chromium

# Pokreni scraper servis
python main.py
```

✅ Scraper radi na: **http://localhost:8001**

Provjera: http://localhost:8001/health

---

### Korak 5 – Pokreni frontend

Otvori **novi PowerShell prozor**:

```powershell
cd C:\Users\nordin.hodzic\Desktop\K1\frontend

# Instaliraj dependencies (samo jednom)
npm install

# Pokreni frontend
npm run dev
```

✅ Portal radi na: **http://localhost:3000**

---

## Provjera da sve radi

Otvori u browseru:

| URL | Šta treba vidjeti |
|-----|-------------------|
| http://localhost:3000 | K1.ba portal homepage |
| http://localhost:8000/health | `{"status":"ok"}` |
| http://localhost:8001/health | Scraper status |
| http://localhost:11434/api/tags | Lista Ollama modela |

---

## Admin panel

**URL:** http://localhost:3000/admin

**Kredencijali:**
- Email: `admin@k1.ba`
- Lozinka: `AdminK1#2024`

Iz admin panela možeš:
- Pregledati sve vijesti
- Objaviti/arhivirati vijesti
- Vidjeti AI kvalitet score
- Pokrenuti scraper ručno
- Vidjeti logove

---

## Ručno pokretanje scrapera

```powershell
# Iz admin panela (preporučeno):
# http://localhost:3000/admin/scraper → klik na "Pokreni odmah"

# Ili direktno API poziv:
curl -X POST http://localhost:8001/api/scrape/trigger `
  -H "X-Secret: your-scraper-secret"
```

---

## Vizualni pregled baze (opcionalno)

```powershell
cd C:\Users\nordin.hodzic\Desktop\K1\backend
npm run db:studio
```

Otvori: http://localhost:5555

---

## Docker pokretanje (sve odjednom)

```powershell
cd C:\Users\nordin.hodzic\Desktop\K1

# Pokreni sve servise
docker compose up -d postgres redis backend scraper ollama frontend

# Čekaj 20 sekundi, zatim pokreni migracije
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed

# Preuzmi AI model
docker exec k1_ollama ollama pull deepseek-r1:7b
```

Portal: http://localhost:3000

---

## Česta pitanja

### "Baza se ne može spojiti"
```powershell
# Provjeri radi li PostgreSQL
docker ps | grep postgres

# Ako ne radi:
docker compose up postgres -d
```

### "Scraper ne pronalazi vijesti"
- Provjeri internet konekciju
- Možda su portali privremeno blokili request – scraper automatski čeka i pokušava ponovo
- Provjeri logove: http://localhost:3000/admin/scraper

### "Ollama ne radi"
- Pokreni Ollama Desktop aplikaciju
- Provjeri: `ollama list` – treba pokazati preuzeti model
- Ako model nije preuzet: `ollama pull mistral:7b`

### "Frontend build greška"
```powershell
cd frontend
npm install --legacy-peer-deps
npm run build
```

### Promjena AI modela
Uredi `C:\Users\nordin.hodzic\Desktop\K1\scraper\.env`:
```
OLLAMA_MODEL=mistral:7b
```
Zatim restartaj scraper.

---

## Tech stack podsjetnik

| Komponenta | Port | Tehnologija |
|-----------|------|-------------|
| Frontend | 3000 | Next.js 15, TypeScript, Tailwind |
| Backend | 8000 | Node.js, Express, Prisma |
| Scraper | 8001 | Python, FastAPI |
| PostgreSQL | 5432 | Docker |
| Redis | 6379 | Docker |
| Ollama (AI) | 11434 | Lokalni modeli |
