$ErrorActionPreference = "Stop"

$SiteUrl = if ($env:SITE_URL) { $env:SITE_URL.TrimEnd("/") } else { "http://127.0.0.1" }
$ComposeFile = if ($env:COMPOSE_FILE) { $env:COMPOSE_FILE } else { "docker-compose.prod.yml" }

Write-Host "== Git =="
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
git status --short

Write-Host ""
Write-Host "== Production files =="
@(
  "Dockerfile.frontend",
  "Dockerfile.backend",
  "docker-compose.prod.yml",
  "deploy/caddy/Caddyfile",
  "frontend/package.json",
  "backend/requirements.txt"
) | ForEach-Object {
  if (!(Test-Path $_)) { throw "Missing production file: $_" }
}
Write-Host "Production stack files present"

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
  Invoke-WebRequest -UseBasicParsing "$SiteUrl/macro-board" | Out-Null
  Write-Host "MacroBoard responds"
} catch {
  Write-Host "MacroBoard did not respond at $SiteUrl/macro-board"
}

try {
  Invoke-WebRequest -UseBasicParsing "$SiteUrl/api/health" | Out-Null
  Write-Host "API health responds"
} catch {
  Write-Host "API health did not respond at $SiteUrl/api/health"
}

try {
  Invoke-WebRequest -UseBasicParsing "$SiteUrl/api/version" | Out-Null
  Write-Host "API version responds"
} catch {
  Write-Host "API version did not respond at $SiteUrl/api/version"
}

@(
  "/backend/app/main.py",
  "/frontend/package.json",
  "/ai-edit-factory/docker-compose.prod.yml"
) | ForEach-Object {
  $Path = $_
  try {
    $response = Invoke-WebRequest -UseBasicParsing "$SiteUrl$Path" -Method Head
    if ($response.StatusCode -eq 200) {
      throw "Source path is publicly reachable: $Path"
    }
    Write-Host "Source path blocked: $Path -> $($response.StatusCode)"
  } catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -ne 200) {
      Write-Host "Source path blocked: $Path"
    } elseif ($_.Exception.Message -like "Source path is publicly reachable:*") {
      throw
    } else {
      Write-Host "Source path check did not return 200 for $Path"
    }
  }
}

Write-Host ""
Write-Host "Verification complete. Confirm /api/version reflects the current commit after deployment."
