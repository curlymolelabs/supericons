param(
    [switch]$ExecuteApprovedMaterialHostedSeed
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedMaterialHostedSeed) {
    throw 'This runner is limited to an owner-approved Material hosted seed. Pass -ExecuteApprovedMaterialHostedSeed to continue.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$seederPath = Join-Path $PSScriptRoot 'seed-material-owned-cache.js'
$expectedAssetReportPath = Join-Path $repoRoot 'references\verification\material-full-asset-validation-2026-07-14.json'
$reportVerifierPath = Join-Path $PSScriptRoot 'verify-material-hosted-seed-report.mjs'
$preflightPath = Join-Path $PSScriptRoot 'sql\material-assets-hosted-seed-preflight.sql'
$postflightPath = Join-Path $PSScriptRoot 'sql\material-assets-hosted-seed-postflight.sql'
$poolerPath = Join-Path $repoRoot 'supabase\.temp\pooler-url'
$reportPath = Join-Path $repoRoot 'tmp\material-hosted-seed-425d8c287.json'
$postgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.132'
$projectRef = 'kcjmkakdhsqplvasgkjv'
$supabaseUrl = "https://$projectRef.supabase.co"

$expectedHashes = @{
    $seederPath = 'a3dd8a252819930cd7ab1dfa014eea76907fff6b9a9d2ed51715214fced82b19'
    $expectedAssetReportPath = '4e04f3894566fc0b8f9011f38847f27cb40d48d738415ea9c6df41f1d58e9e92'
    $reportVerifierPath = '1e8f7fe040c721e5691fb501ccd4f1529628a0737041a5a6b58b70da90059d24'
    $preflightPath = '897ffbfad2a4ff65fb0286b7a972f0aee7231bba6a3e6da858d7cf20aee83cee'
    $postflightPath = 'a06ad0cc8a4c4e9cb9b5ad01f3f6328c64dce1598302fd243a97216b2125a5d4'
}

function Invoke-PsqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ContainerPath
    )

    & docker run --rm -i `
        -e PGPASSWORD `
        --mount "type=bind,source=$PSScriptRoot\sql,target=/checks,readonly" `
        $postgresImage `
        psql $script:databaseUrl -X -v ON_ERROR_STOP=1 -f $ContainerPath

    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL command failed for $ContainerPath"
    }
}

foreach ($entry in $expectedHashes.GetEnumerator()) {
    if (-not (Test-Path -LiteralPath $entry.Key)) {
        throw "Required Packet 2 file is missing: $($entry.Key)"
    }
    $actualHash = (Get-FileHash -LiteralPath $entry.Key -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $entry.Value) {
        throw "Packet 2 file hash changed: $($entry.Key)"
    }
}

if (-not (Test-Path -LiteralPath $poolerPath)) {
    throw 'Linked Supabase pooler information is missing. Run supabase link before this runner.'
}

if ([Environment]::GetEnvironmentVariable('SUPERICONS_SUPABASE_SERVICE_ROLE_KEY')) {
    throw 'SUPERICONS_SUPABASE_SERVICE_ROLE_KEY is already set and would shadow the guarded prompt. Remove it before running Packet 2.'
}

& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker is not available.'
}

$poolerUrl = (Get-Content -Raw $poolerPath).Trim()
if (-not $poolerUrl.StartsWith('postgresql://')) {
    throw 'Linked Supabase pooler URL is invalid.'
}

$script:databaseUrl = "${poolerUrl}?sslmode=require&application_name=supericons_material_hosted_seed"
$secureDatabasePassword = Read-Host 'Supabase database password' -AsSecureString

try {
    $plainDatabasePassword = [System.Net.NetworkCredential]::new('', $secureDatabasePassword).Password
    $env:PGPASSWORD = $plainDatabasePassword
    $env:SUPABASE_DB_PASSWORD = $plainDatabasePassword
    $plainDatabasePassword = $null

    Invoke-PsqlFile -ContainerPath '/checks/material-assets-hosted-seed-preflight.sql'

    $secureServiceRoleKey = Read-Host 'Supabase service-role key' -AsSecureString
    $plainServiceRoleKey = [System.Net.NetworkCredential]::new('', $secureServiceRoleKey).Password
    if ([string]::IsNullOrWhiteSpace($plainServiceRoleKey)) {
        throw 'Supabase service-role key was empty.'
    }

    $env:SUPABASE_URL = $supabaseUrl
    $env:SUPABASE_SERVICE_ROLE_KEY = $plainServiceRoleKey
    $plainServiceRoleKey = $null

    if (Test-Path -LiteralPath $reportPath) {
        Remove-Item -LiteralPath $reportPath -Force
    }

    & node $seederPath `
        --all `
        --hosted `
        --no-resume `
        --concurrency=6 `
        --retries=3 `
        --request-timeout-ms=15000 `
        "--report=$reportPath"
    if ($LASTEXITCODE -ne 0) {
        throw 'Material hosted seed failed. Do not rerun without a new inspection and approval.'
    }

    & node $reportVerifierPath "--report=$reportPath"
    if ($LASTEXITCODE -ne 0) {
        throw 'Hosted seed report verification failed. Do not rerun without a new inspection and approval.'
    }

    Invoke-PsqlFile -ContainerPath '/checks/material-assets-hosted-seed-postflight.sql'
    Write-Output "Material hosted seed completed. Retained report: $reportPath"
}
finally {
    $plainDatabasePassword = $null
    $plainServiceRoleKey = $null
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
    Remove-Variable secureDatabasePassword -ErrorAction SilentlyContinue
    Remove-Variable secureServiceRoleKey -ErrorAction SilentlyContinue
}
