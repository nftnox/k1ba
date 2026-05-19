# K1.ba lokalno pokretanje – Windows PowerShell

Write-Host "🚀 Pokretanje K1.ba portala lokalno..." -ForegroundColor Cyan

# Provjeri Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker nije instaliran. Instalirajte Docker Desktop." -ForegroundColor Red
    exit 1
}

# Pokreni infrastrukturu
Write-Host "📦 Pokretanje PostgreSQL i Redis..." -ForegroundColor Yellow
docker compose up postgres redis -d

# Čekaj da postgres bude spreman
Write-Host "⏳ Čekam da baza bude spremna..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Backend setup
Write-Host "⚙️  Instaliram backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory (Get-Location)
Set-Location ..

# Frontend setup
Write-Host "🎨 Instaliram frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory (Get-Location)
Set-Location ..

# Scraper setup
Write-Host "🕷️  Postavljam Python scraper..." -ForegroundColor Yellow
Set-Location scraper
if (-not (Get-Command pip -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️  Python/pip nije pronađen. Preskačem scraper." -ForegroundColor Yellow
} else {
    pip install -r requirements.txt
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "python main.py" -WorkingDirectory (Get-Location)
}
Set-Location ..

Write-Host ""
Write-Host "✅ K1.ba je pokrenut!" -ForegroundColor Green
Write-Host ""
Write-Host "  🌐 Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  🔧 Backend:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  🕷️  Scraper:   http://localhost:8001" -ForegroundColor Cyan
Write-Host "  🗄️  DB Studio:  npm run db:studio (u backend/ folderu)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Admin login: admin@k1.ba / AdminK1#2024" -ForegroundColor Yellow
