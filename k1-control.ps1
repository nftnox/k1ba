# K1.ba Control Panel – Start/Stop servisa
# Pokretanje: PowerShell -> .\k1-control.ps1

$host.UI.RawUI.WindowTitle = "K1.ba Control Panel"

function Show-Status {
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "   K1.ba Control Panel" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor DarkGray

    # Docker servisi
    $pgRunning    = (docker ps --filter "name=k1_postgres" --format "{{.Names}}" 2>$null) -ne ""
    $redisRunning = (docker ps --filter "name=k1_redis"    --format "{{.Names}}" 2>$null) -ne ""

    # Portovi (backend/frontend/scraper)
    $backendUp  = (Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null)
    $frontendUp = (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null)
    $scraperUp  = (Test-NetConnection -ComputerName localhost -Port 8001 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null)

    function Icon($running) { if ($running) { return "[ON] " } else { return "[OFF]" } }

    Write-Host ""
    Write-Host "  $(Icon $pgRunning)    PostgreSQL  (baza podataka)" -ForegroundColor $(if ($pgRunning) { "Green" } else { "Red" })
    Write-Host "  $(Icon $redisRunning) Redis       (cache)" -ForegroundColor $(if ($redisRunning) { "Green" } else { "Red" })
    Write-Host "  $(Icon $backendUp)    Backend     http://localhost:8000" -ForegroundColor $(if ($backendUp) { "Green" } else { "Red" })
    Write-Host "  $(Icon $scraperUp)    Scraper     http://localhost:8001" -ForegroundColor $(if ($scraperUp) { "Green" } else { "Red" })
    Write-Host "  $(Icon $frontendUp)   Frontend    http://localhost:3000" -ForegroundColor $(if ($frontendUp) { "Green" } else { "Red" })
    Write-Host ""
}

function Start-Infrastructure {
    Write-Host "Pokretam PostgreSQL i Redis..." -ForegroundColor Yellow
    docker compose up postgres redis -d
    Write-Host "Cekam 5 sekundi da baza bude spremna..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Write-Host "Infrastruktura pokrenuta." -ForegroundColor Green
}

function Stop-Infrastructure {
    Write-Host "Zaustavljam PostgreSQL i Redis..." -ForegroundColor Yellow
    docker compose stop postgres redis
    Write-Host "Infrastruktura zaustavljena." -ForegroundColor Green
}

function Start-Backend {
    $dir = Join-Path $PSScriptRoot "backend"
    Write-Host "Pokretam backend na portu 8000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dir'; npm run dev" -WindowStyle Normal
    Write-Host "Backend prozor otvoren." -ForegroundColor Green
}

function Start-Frontend {
    $dir = Join-Path $PSScriptRoot "frontend"
    Write-Host "Pokretam frontend na portu 3000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dir'; npm run dev" -WindowStyle Normal
    Write-Host "Frontend prozor otvoren." -ForegroundColor Green
}

function Start-Scraper {
    $dir = Join-Path $PSScriptRoot "scraper"
    Write-Host "Pokretam scraper na portu 8001..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$dir'; python -X utf8 main.py" -WindowStyle Normal
    Write-Host "Scraper prozor otvoren." -ForegroundColor Green
}

function Stop-ByPort($port, $name) {
    $pid = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
    if ($pid) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "$name zaustavljen (PID $pid)." -ForegroundColor Green
    } else {
        Write-Host "$name vec nije radio." -ForegroundColor DarkGray
    }
}

# ─── Glavni loop ──────────────────────────────────────────────────────────────

while ($true) {
    Show-Status

    Write-Host "  Odaberi akciju:" -ForegroundColor White
    Write-Host "  1  Pokreni SVE (baza + backend + frontend + scraper)"
    Write-Host "  2  Zaustavi SVE"
    Write-Host "  3  Samo baza (PostgreSQL + Redis)"
    Write-Host "  4  Samo backend"
    Write-Host "  5  Samo frontend"
    Write-Host "  6  Samo scraper"
    Write-Host "  7  Zaustavi backend"
    Write-Host "  8  Zaustavi scraper"
    Write-Host "  9  Zaustavi frontend"
    Write-Host "  R  Osvjezi status"
    Write-Host "  0  Izlaz"
    Write-Host ""
    $choice = Read-Host "  Unesi broj"

    switch ($choice.Trim()) {
        "1" {
            Start-Infrastructure
            Start-Backend
            Start-Frontend
            Start-Scraper
        }
        "2" {
            Stop-ByPort 8000 "Backend"
            Stop-ByPort 8001 "Scraper"
            Stop-ByPort 3000 "Frontend"
            Stop-Infrastructure
        }
        "3" { Start-Infrastructure }
        "4" { Start-Backend }
        "5" { Start-Frontend }
        "6" { Start-Scraper }
        "7" { Stop-ByPort 8000 "Backend" }
        "8" { Stop-ByPort 8001 "Scraper" }
        "9" { Stop-ByPort 3000 "Frontend" }
        "R" { }  # samo ponovo prikazuje status
        "r" { }
        "0" { break }
        default { Write-Host "Nepoznata opcija." -ForegroundColor Red }
    }

    if ($choice -eq "0") { break }
    Write-Host ""
    Start-Sleep -Seconds 1
}
