$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root '.env'
if (Test-Path $target) { Write-Host '.env already exists; preserving your configuration.'; exit 0 }
function New-RandomSecret {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bytes)
}
$template = [IO.File]::ReadAllText((Join-Path $root '.env.example'))
$template = $template.Replace('POSTGRES_PASSWORD=GENERATE_WITH_INIT_SCRIPT', ('POSTGRES_PASSWORD=' + (New-RandomSecret)))
$template = $template.Replace('JWT_KEY=GENERATE_WITH_INIT_SCRIPT', ('JWT_KEY=' + (New-RandomSecret)))
[IO.File]::WriteAllText($target, $template, (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'Created .env with unique local secrets. Add YOUTUBE_API_KEY if desired.'
