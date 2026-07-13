param(
    [switch]$ExecuteApprovedGateB
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedGateB) {
    throw 'This runner is limited to the approved Gate B migration. Pass -ExecuteApprovedGateB to continue.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$migrationName = '20260712_search_v2_beta_measurement.sql'
$migrationPath = Join-Path $repoRoot "supabase\migrations\$migrationName"
$migrationDirectory = Split-Path -Parent $migrationPath
$checkDirectory = Join-Path $PSScriptRoot 'sql'
$poolerPath = Join-Path $repoRoot 'supabase\.temp\pooler-url'
$expectedMigrationHash = 'dbe4419b8debde9b6435ab3aa9d451152442272f10a0972ea89e7b3dafea2ad1'
$postgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.132'

function Invoke-PsqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ContainerPath,

        [switch]$SingleTransaction
    )

    $dockerArguments = @(
        'run',
        '--rm',
        '-i',
        '-e',
        'PGPASSWORD',
        '--mount',
        "type=bind,source=$migrationDirectory,target=/migrations,readonly",
        '--mount',
        "type=bind,source=$checkDirectory,target=/checks,readonly",
        $postgresImage,
        'psql',
        $script:databaseUrl,
        '-X',
        '-v',
        'ON_ERROR_STOP=1'
    )

    if ($SingleTransaction) {
        $dockerArguments += '--single-transaction'
    }

    $dockerArguments += @('-f', $ContainerPath)
    & docker @dockerArguments

    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL command failed for $ContainerPath"
    }
}

if (-not (Test-Path $migrationPath)) {
    throw "Migration file is missing: $migrationPath"
}

if (-not (Test-Path $poolerPath)) {
    throw 'Linked Supabase pooler information is missing. Run supabase link before this runner.'
}

$actualMigrationHash = (Get-FileHash $migrationPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualMigrationHash -ne $expectedMigrationHash) {
    throw "Migration hash changed. Expected $expectedMigrationHash but found $actualMigrationHash"
}

& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker is not available.'
}

$poolerUrl = (Get-Content -Raw $poolerPath).Trim()
if (-not $poolerUrl.StartsWith('postgresql://')) {
    throw 'Linked Supabase pooler URL is invalid.'
}

$script:databaseUrl = "${poolerUrl}?sslmode=require&application_name=supericons_gate_b"
$securePassword = Read-Host 'Supabase database password' -AsSecureString

try {
    $plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
    $env:PGPASSWORD = $plainPassword
    $env:SUPABASE_DB_PASSWORD = $plainPassword
    $plainPassword = $null

    Invoke-PsqlFile -ContainerPath '/checks/search-v2-beta-hosted-preflight.sql'
    Invoke-PsqlFile -ContainerPath "/migrations/$migrationName" -SingleTransaction
    Invoke-PsqlFile -ContainerPath '/checks/search-v2-beta-hosted-postflight.sql'

    supabase migration repair 20260712 --status applied --linked
    if ($LASTEXITCODE -ne 0) {
        throw 'The SQL passed, but migration history repair failed. Do not rerun this script. Verify the hosted objects and retry only the history repair.'
    }

    supabase migration list --linked
    if ($LASTEXITCODE -ne 0) {
        throw 'Migration applied and history repaired, but the final migration list failed.'
    }

    Write-Output 'Gate B database migration and version 20260712 history repair completed.'
}
finally {
    $plainPassword = $null
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Variable securePassword -ErrorAction SilentlyContinue
}
