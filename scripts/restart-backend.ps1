$ErrorActionPreference = "Stop"

$port = 44301
$hostPath = Join-Path $PSScriptRoot "..\GestionCourrierAbp\src\GestionCourrierAbp.HttpApi.Host"

$listeners = netstat -ano |
    Select-String ":$port" |
    ForEach-Object { ($_ -split "\s+")[-1] } |
    Where-Object { $_ -and $_ -ne "0" } |
    Sort-Object -Unique

foreach ($processId in $listeners) {
    Write-Host "Stopping process $processId using port $port..."
    Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
}

Set-Location $hostPath
Write-Host "Starting GestionCourrierAbp backend on http://localhost:$port ..."
dotnet run
