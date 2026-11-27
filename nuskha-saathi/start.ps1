$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$PythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    Write-Host "Creating Python virtual environment in backend\.venv..."
    python -m venv (Join-Path $BackendDir ".venv")
    & $PythonExe -m pip install -r (Join-Path $BackendDir "requirements.txt")
}

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..."
    Push-Location $FrontendDir
    npm ci
    Pop-Location
}

Write-Host "Starting Nuskha Saathi backend (http://localhost:8000)..."
$backend = Start-Process -FilePath $PythonExe -ArgumentList "main.py" -WorkingDirectory $BackendDir -PassThru

Write-Host "Starting Nuskha Saathi frontend (http://localhost:3000)..."
Push-Location $FrontendDir
try {
    npm run dev
} finally {
    Pop-Location
    if ($backend -and -not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force
    }
}
