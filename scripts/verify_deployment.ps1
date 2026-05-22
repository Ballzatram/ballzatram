$ErrorActionPreference = "Stop"

$SiteUrl = if ($env:SITE_URL) { $env:SITE_URL.TrimEnd("/") } else { "http://127.0.0.1" }
$ComposeFile = if ($env:COMPOSE_FILE) { $env:COMPOSE_FILE } else { "ai-edit-factory/docker-compose.prod.yml" }

Write-Host "== Git =="
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git status --short

Write-Host ""
Write-Host "== Static assets =="
@(
  "index.html",
  "weather-bot.html",
  "tools/parcel/index.html",
  "tools/macroboard/index.html",
  "econ-arcade/index.html",
  "ai-edit-factory/index.html"
) | ForEach-Object {
  if (!(Test-Path $_)) { throw "Missing static entrypoint: $_" }
}
Write-Host "Static entrypoints present"

Write-Host ""
Write-Host "== Compose =="
if (Test-Path $ComposeFile) {
  Write-Host "Compose file: $ComposeFile"
  if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose -f $ComposeFile config | Out-Null
    Write-Host "Compose config is valid"
    docker compose -f $ComposeFile ps
  } else {
    Write-Host "Docker is not installed here; run docker compose ps on the server."
  }
} else {
  Write-Host "Compose file missing: $ComposeFile"
}

if ($env:VERIFY_BUILD -eq "1") {
  Write-Host ""
  Write-Host "== Optional local builds =="
  Push-Location frontend
  npm run lint
  npm run build
  Pop-Location
  Push-Location weather-trader
  npm run build
  Pop-Location
  Push-Location ai-edit-factory/frontend
  npm run build
  Pop-Location
}

Write-Host ""
Write-Host "== HTTP checks =="
try {
  Invoke-WebRequest -UseBasicParsing "$SiteUrl/" | Out-Null
  Write-Host "Home responds: $SiteUrl/"
} catch {
  Write-Host "Home did not respond at $SiteUrl/"
}

try {
  Invoke-WebRequest -UseBasicParsing "$SiteUrl/weather-bot.html" | Out-Null
  Write-Host "Weather Desk responds"
} catch {
  Write-Host "Weather Desk did not respond at $SiteUrl/weather-bot.html"
}

try {
  Invoke-WebRequest -UseBasicParsing "$SiteUrl/api/health" | Out-Null
  Write-Host "AI Edit health responds"
} catch {
  Write-Host "AI Edit health did not respond at $SiteUrl/api/health"
}

Write-Host ""
Write-Host "Verification complete. Confirm the live page reflects the current commit after deployment."
