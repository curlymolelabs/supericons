param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$ApprovalFingerprint,

  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRef = 'kcjmkakdhsqplvasgkjv'
$MigrationVersion = '20260716040000'
$MigrationName = '20260716040000_admin_dashboard_phase_a.sql'
$PostgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.132'
$Root = Split-Path -Parent $PSScriptRoot
$MigrationDirectory = Join-Path $Root 'supabase\migrations'
$CheckDirectory = Join-Path $PSScriptRoot 'sql'
$PoolerPath = Join-Path $Root 'supabase\.temp\pooler-url'
$CompletionPath = Join-Path $Root 'references\verification\admin-dashboard-phase-a-migration-completion-2026-07-16.json'

function Invoke-PsqlFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ContainerPath,
    [switch]$SingleTransaction
  )

  $arguments = @(
    'run', '--rm', '-i', '-e', 'PGPASSWORD',
    '--mount', "type=bind,source=$MigrationDirectory,target=/migrations,readonly",
    '--mount', "type=bind,source=$CheckDirectory,target=/checks,readonly",
    $PostgresImage,
    'psql', $script:DatabaseUrl, '-X', '-v', 'ON_ERROR_STOP=1'
  )
  if ($SingleTransaction) { $arguments += '--single-transaction' }
  $arguments += @('-f', $ContainerPath)
  & docker @arguments
  if ($LASTEXITCODE -ne 0) { throw "PostgreSQL command failed for $ContainerPath" }
}

if (-not $Execute) {
  throw 'Pass -Execute only after the owner has approved the exact packet fingerprint.'
}

Set-Location $Root
if (Test-Path -LiteralPath $CompletionPath) {
  throw "This packet is write-once and completion evidence already exists: $CompletionPath"
}
if (-not (Test-Path -LiteralPath $PoolerPath)) {
  throw 'Linked Supabase pooler information is missing. Run supabase login and supabase link first.'
}

node scripts/verify-admin-dashboard-phase-a-migration-packet.mjs --fingerprint $ApprovalFingerprint
if ($LASTEXITCODE -ne 0) { throw 'The migration packet verifier failed.' }
npm run verify:private-table-migrations
if ($LASTEXITCODE -ne 0) { throw 'The private-table migration policy gate failed.' }
npm run verify:admin-dashboard-phase-a-migration
if ($LASTEXITCODE -ne 0) { throw 'The disposable migration gate failed.' }

docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker is not available.' }

$poolerUrl = (Get-Content -LiteralPath $PoolerPath -Raw).Trim()
if (-not $poolerUrl.StartsWith('postgresql://')) { throw 'Linked Supabase pooler URL is invalid.' }
$script:DatabaseUrl = "${poolerUrl}?sslmode=require&application_name=supericons_admin_dashboard_phase_a_migration"
$securePassword = Read-Host 'Supabase database password' -AsSecureString
$startedAt = [DateTime]::UtcNow.ToString('o')

try {
  $plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
  $env:PGPASSWORD = $plainPassword
  $plainPassword = $null

  Invoke-PsqlFile -ContainerPath '/checks/admin-dashboard-phase-a-hosted-preflight.sql'
  Invoke-PsqlFile -ContainerPath "/migrations/$MigrationName" -SingleTransaction
  Invoke-PsqlFile -ContainerPath '/checks/admin-dashboard-phase-a-hosted-postflight.sql'

  supabase migration repair $MigrationVersion --status applied --linked
  if ($LASTEXITCODE -ne 0) {
    throw 'The SQL and postflight passed, but migration history repair failed. Do not rerun the SQL.'
  }
  supabase migration list --linked
  if ($LASTEXITCODE -ne 0) { throw 'Migration applied, but the final migration list failed.' }

  [ordered]@{
    artifact = 'admin_dashboard_phase_a_migration_completion'
    approval_fingerprint = $ApprovalFingerprint
    project_ref = $ProjectRef
    migration_version = $MigrationVersion
    started_at = $startedAt
    finished_at = [DateTime]::UtcNow.ToString('o')
    postflight = 'pass'
    history_repair = 'pass'
  } | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $CompletionPath -Encoding utf8
}
finally {
  $plainPassword = $null
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Variable securePassword -ErrorAction SilentlyContinue
}
