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
$LinkedProjectPath = Join-Path $Root 'supabase\.temp\linked-project.json'
$CompletionPath = Join-Path $Root 'references\verification\admin-dashboard-phase-a-migration-completion-2026-07-16.json'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Invoke-PsqlFiles {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$ContainerPaths,
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
  foreach ($containerPath in $ContainerPaths) {
    $arguments += @('-f', $containerPath)
  }
  & docker @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL command failed for $($ContainerPaths -join ', ')"
  }
}

function Invoke-SupabaseTextCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $lines = @(& supabase @Arguments 2>&1)
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne 0) {
    throw "Supabase CLI failed with exit code $exitCode. $($lines -join ' ')"
  }
  return @($lines | ForEach-Object { "$_" })
}

function Assert-LinkedProject {
  if (-not (Test-Path -LiteralPath $LinkedProjectPath)) {
    throw 'Linked Supabase project metadata is missing. Run supabase link first.'
  }
  try {
    $linkedProject = Get-Content -LiteralPath $LinkedProjectPath -Raw | ConvertFrom-Json
  }
  catch {
    throw "Linked Supabase project metadata is invalid. $($_.Exception.Message)"
  }
  if ("$($linkedProject.ref)" -ne $ProjectRef) {
    throw "Linked Supabase project mismatch. Expected $ProjectRef, received $($linkedProject.ref)."
  }
}

if (-not $Execute) {
  throw 'Pass -Execute only after the owner has approved the exact packet fingerprint.'
}

Set-Location $Root
if (Test-Path -LiteralPath $CompletionPath) {
  throw "This packet is write-once and completion evidence already exists: $CompletionPath"
}
Assert-LinkedProject
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
if (-not $poolerUrl.Contains($ProjectRef)) {
  throw 'Linked Supabase pooler URL does not match the approved project.'
}
$querySeparator = if ($poolerUrl.Contains('?')) { '&' } else { '?' }
$script:DatabaseUrl = "${poolerUrl}${querySeparator}sslmode=require&application_name=supericons_admin_dashboard_phase_a_migration"
$securePassword = Read-Host 'Supabase database password' -AsSecureString
$startedAt = [DateTime]::UtcNow.ToString('o')

try {
  $plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
  $env:PGPASSWORD = $plainPassword
  $env:SUPABASE_DB_PASSWORD = $plainPassword
  $plainPassword = $null

  $null = Invoke-SupabaseTextCommand -Arguments @('migration', 'list', '--linked')
  Invoke-PsqlFiles -ContainerPaths @('/checks/admin-dashboard-phase-a-hosted-preflight.sql')
  Invoke-PsqlFiles -ContainerPaths @(
    "/migrations/$MigrationName",
    '/checks/admin-dashboard-phase-a-hosted-postflight.sql'
  ) -SingleTransaction

  try {
    $null = Invoke-SupabaseTextCommand -Arguments @(
      'migration', 'repair', $MigrationVersion, '--status', 'applied', '--linked'
    )
  }
  catch {
    throw "The SQL and postflight passed, but migration history repair failed. Do not rerun the SQL. $($_.Exception.Message)"
  }
  $null = Invoke-SupabaseTextCommand -Arguments @('migration', 'list', '--linked')

  $completion = [ordered]@{
    artifact = 'admin_dashboard_phase_a_migration_completion'
    approval_fingerprint = $ApprovalFingerprint
    project_ref = $ProjectRef
    migration_version = $MigrationVersion
    started_at = $startedAt
    finished_at = [DateTime]::UtcNow.ToString('o')
    postflight = 'pass'
    history_repair = 'pass'
  }
  [System.IO.File]::WriteAllText(
    $CompletionPath,
    "$(ConvertTo-Json $completion -Depth 4)`n",
    $Utf8NoBom
  )
}
finally {
  $plainPassword = $null
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_DB_PASSWORD -ErrorAction SilentlyContinue
  Remove-Variable securePassword -ErrorAction SilentlyContinue
}
