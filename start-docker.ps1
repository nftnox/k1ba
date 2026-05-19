# K1.ba Docker pokretanje

Write-Host "🐳 Pokretanje K1.ba sa Dockerom..." -ForegroundColor Cyan

# Provjeri Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker nije instaliran." -ForegroundColor Red
    exit 1
}

# Kreiraj .env ako ne postoji
if (-not (Test-Path ".env")) {
    Copy-Item ".env.production" ".env"
    Write-Host "⚠️  Kreiran .env fajl. OBAVEZNO promijeni lozinke u .env!" -ForegroundColor Yellow
}

# Pokreni servise
Write-Host "📦 Pokretam Docker kontejnere..." -ForegroundColor Yellow
docker compose up -d postgres redis backend scraper ollama frontend

Write-Host "⏳ Čekam pokretanje servisa..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Pokreni migracije
Write-Host "🗄️  Pokretam migracije baze..." -ForegroundColor Yellow
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run db:seed

Write-Host ""
Write-Host "✅ K1.ba je pokrenut u Docker okruženju!" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Portal:     http://localhost:3000" -ForegroundColor Cyan
Write-Host "  🔧 Backend:    http://localhost:8000" -ForegroundColor Cyan
Write-Host "  🕷️  Scraper:    http://localhost:8001" -ForegroundColor Cyan
Write-Host "  🤖 Ollama:     http://localhost:11434" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Preuzmi AI model (samo jednom):" -ForegroundColor Yellow
Write-Host "  docker exec k1_ollama ollama pull deepseek-r1:7b" -ForegroundColor White
Write-Host ""
Write-Host "  Admin: admin@k1.ba / AdminK1#2024" -ForegroundColor Yellow
