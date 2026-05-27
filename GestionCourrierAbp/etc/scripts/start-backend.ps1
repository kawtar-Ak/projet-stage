param(
    [switch]$Migrate
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$solutionRoot = Resolve-Path (Join-Path $scriptRoot "../..")
$hostProject = Join-Path $solutionRoot "src/GestionCourrierAbp.HttpApi.Host/GestionCourrierAbp.HttpApi.Host.csproj"
$hostDirectory = Join-Path $solutionRoot "src/GestionCourrierAbp.HttpApi.Host"
$backendPort = 44301

function Stop-ExistingBackend {
    $processIds = @()

    $portProcesses = netstat -ano |
        Select-String ":$backendPort" |
        ForEach-Object { ($_ -split "\s+")[-1] } |
        Where-Object { $_ -and $_ -ne "0" }

    $processIds += $portProcesses
    $processIds += Get-Process -Name "GestionCourrierAbp.HttpApi.Host" -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty Id

    foreach ($processId in ($processIds | Sort-Object -Unique)) {
        Write-Host "Stopping existing backend process $processId..."
        Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
    }
}

Stop-ExistingBackend

if ($Migrate) {
    Write-Host "Migrating database..."
    Push-Location (Join-Path $solutionRoot "src/GestionCourrierAbp.DbMigrator")
    try {
        dotnet run
        if ($LASTEXITCODE -ne 0) {
            throw "dotnet run (DbMigrator) exited with code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}

$env:ASPNETCORE_ENVIRONMENT = "Development"

Write-Host "Starting backend on http://localhost:$backendPort ..."
dotnet run --project $hostProject --launch-profile "GestionCourrierAbp.HttpApi.Host"

if ($LASTEXITCODE -ne 0) {
    throw "Backend exited with code $LASTEXITCODE"
}
