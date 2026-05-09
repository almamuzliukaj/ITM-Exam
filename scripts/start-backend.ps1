$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendProject = Join-Path $repoRoot "backend\OnlineExam.Api\OnlineExam.Api.csproj"
$backendUrl = "http://localhost:5045"
$backendPort = 5045

Write-Host "Starting PostgreSQL container..." -ForegroundColor Cyan
docker compose up -d db | Out-Host

Write-Host "Waiting for PostgreSQL on port 5432..." -ForegroundColor Cyan
$dbReady = $false
for ($attempt = 1; $attempt -le 20; $attempt++) {
    try {
        $connection = Get-NetTCPConnection -State Listen -LocalPort 5432 -ErrorAction Stop
        if ($connection) {
            $dbReady = $true
            break
        }
    } catch {
    }

    Start-Sleep -Seconds 2
}

if (-not $dbReady) {
    throw "PostgreSQL did not become ready on port 5432."
}

try {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $backendPort -ErrorAction Stop | Select-Object -First 1
    if ($listener) {
        Write-Host "Stopping existing backend process on port $backendPort (PID $($listener.OwningProcess))..." -ForegroundColor Yellow
        Stop-Process -Id $listener.OwningProcess -Force
        Start-Sleep -Seconds 2
    }
} catch {
}

Write-Host "Starting backend at $backendUrl ..." -ForegroundColor Green
dotnet run --project $backendProject --launch-profile http
