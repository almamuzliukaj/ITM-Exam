$ErrorActionPreference = "SilentlyContinue"

$backendPort = 5045
$listener = Get-NetTCPConnection -State Listen -LocalPort $backendPort | Select-Object -First 1

if ($listener) {
    Write-Host "Stopping backend process on port $backendPort (PID $($listener.OwningProcess))..." -ForegroundColor Yellow
    Stop-Process -Id $listener.OwningProcess -Force
} else {
    Write-Host "No backend process is listening on port $backendPort." -ForegroundColor Cyan
}
