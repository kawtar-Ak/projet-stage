param(
    [switch]$Migrate
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$solutionRoot = Resolve-Path (Join-Path $scriptRoot "../..")
$hostProject = Join-Path $solutionRoot "src/GestionCourrierAbp.HttpApi.Host/GestionCourrierAbp.HttpApi.Host.csproj"
$hostDirectory = Join-Path $solutionRoot "src/GestionCourrierAbp.HttpApi.Host"
$hostDllFragment = "GestionCourrierAbp.HttpApi.Host.dll"

function Stop-ExistingBackend {
    $escapedHostDirectory = [Regex]::Escape((Resolve-Path $hostDirectory).Path)
    $escapedHostProject = [Regex]::Escape((Resolve-Path $hostProject).Path)

    $processes = Get-CimInstance Win32_Process |
        Where-Object {
            ($_.Name -eq "GestionCourrierAbp.HttpApi.Host.exe") -or
            (
                $_.Name -eq "dotnet.exe" -and
                $_.CommandLine -and
                (
                    $_.CommandLine -match $escapedHostProject -or
                    $_.CommandLine -match $escapedHostDirectory -or
                    $_.CommandLine -like "*$hostDllFragment*"
                )
            )
        }

    foreach ($process in $processes) {
        Write-Host "Stopping existing backend process $($process.ProcessId)..."
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
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

Write-Host "Starting backend on http://localhost:44301 ..."
dotnet run --project $hostProject --launch-profile "GestionCourrierAbp.HttpApi.Host"

if ($LASTEXITCODE -ne 0) {
    throw "Backend exited with code $LASTEXITCODE"
}
