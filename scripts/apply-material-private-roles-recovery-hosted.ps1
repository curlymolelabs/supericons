param(
    [switch]$ExecuteApprovedMaterialPrivateRolesRecovery
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedMaterialPrivateRolesRecovery) {
    throw 'This runner is limited to an owner-approved Material private-role recovery. Pass -ExecuteApprovedMaterialPrivateRolesRecovery to continue.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$originalVersion = '20260714220000'
$originalName = "${originalVersion}_material_icon_assets.sql"
$originalPath = Join-Path $repoRoot "supabase\migrations\$originalName"
$recoveryVersion = '20260714223000'
$recoveryName = "${recoveryVersion}_material_icon_assets_private_roles.sql"
$recoveryPath = Join-Path $repoRoot "supabase\migrations\$recoveryName"
$migrationDirectory = Split-Path -Parent $originalPath
$checkDirectory = Join-Path $PSScriptRoot 'sql'
$poolerPath = Join-Path $repoRoot 'supabase\.temp\pooler-url'
$expectedOriginalHash = '497f6b838e8e3b01e8a3bbeb8d2e57327512c16784d3ad37c2824b6c99699d08'
$expectedRecoveryHash = '2be4ba6f0cf81f1093108dedf41b27328590c92cc77a36f251f0e69b3f91827e'
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

foreach ($path in @($originalPath, $recoveryPath)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Migration file is missing: $path"
    }
}

if (-not (Test-Path -LiteralPath $poolerPath)) {
    throw 'Linked Supabase pooler information is missing. Run supabase link before this runner.'
}

$actualOriginalHash = (Get-FileHash $originalPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualOriginalHash -ne $expectedOriginalHash) {
    throw "Original migration hash changed. Expected $expectedOriginalHash but found $actualOriginalHash"
}

$actualRecoveryHash = (Get-FileHash $recoveryPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualRecoveryHash -ne $expectedRecoveryHash) {
    throw "Recovery migration hash changed. Expected $expectedRecoveryHash but found $actualRecoveryHash"
}

& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker is not available.'
}

$poolerUrl = (Get-Content -Raw $poolerPath).Trim()
if (-not $poolerUrl.StartsWith('postgresql://')) {
    throw 'Linked Supabase pooler URL is invalid.'
}

$script:databaseUrl = "${poolerUrl}?sslmode=require&application_name=supericons_material_private_roles_recovery"
$securePassword = Read-Host 'Supabase database password' -AsSecureString

try {
    $plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
    $env:PGPASSWORD = $plainPassword
    $env:SUPABASE_DB_PASSWORD = $plainPassword
    $plainPassword = $null

    Invoke-PsqlFile -ContainerPath '/checks/material-assets-private-roles-recovery-preflight.sql'
    Invoke-PsqlFile -ContainerPath "/migrations/$recoveryName" -SingleTransaction
    Invoke-PsqlFile -ContainerPath '/checks/material-assets-hosted-postflight.sql'

    supabase migration repair $originalVersion --status applied --linked
    if ($LASTEXITCODE -ne 0) {
        throw 'Recovery SQL and postflight passed, but the original migration-history repair failed. Do not rerun the SQL. Retry only the original history repair.'
    }

    supabase migration repair $recoveryVersion --status applied --linked
    if ($LASTEXITCODE -ne 0) {
        throw 'Original history repair passed, but recovery migration-history repair failed. Do not rerun the SQL or original repair. Retry only the recovery history repair.'
    }

    supabase migration list --linked
    if ($LASTEXITCODE -ne 0) {
        throw 'Both repairs passed, but the final migration list failed.'
    }

    Write-Output "Material private-role recovery $recoveryVersion completed."
}
finally {
    $plainPassword = $null
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Variable securePassword -ErrorAction SilentlyContinue
}
