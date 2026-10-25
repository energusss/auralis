$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root '.env'
if (!(Test-Path $envFile)) { throw 'Run scripts/init-env.ps1 first.' }
foreach ($line in [IO.File]::ReadAllLines($envFile)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $name = $Matches[1]; $value = $Matches[2].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) { $value = $value.Substring(1, $value.Length - 2) }
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}
if ([string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
    $env:DATABASE_URL = "Host=localhost;Port=5432;Database=$($env:POSTGRES_DB);Username=$($env:POSTGRES_USER);Password=$($env:POSTGRES_PASSWORD)"
}
if ([string]::IsNullOrWhiteSpace($env:JWT_KEY) -or $env:JWT_KEY -eq 'GENERATE_WITH_INIT_SCRIPT') { throw 'Set JWT_KEY to a random secret of at least 32 characters.' }
Push-Location $root
try { dotnet run --project backend/Auralis.Api; if ($LASTEXITCODE -ne 0) { throw 'Backend exited with an error.' } } finally { Pop-Location }
