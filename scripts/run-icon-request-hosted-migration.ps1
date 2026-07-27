param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$ReleaseFingerprint,

  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRef = 'kcjmkakdhsqplvasgkjv'
$MigrationVersion = '20260727120000'
$MigrationName = '20260727120000_icon_request_events.sql'
$ExpectedMigrationHash = '494f3b9662efcc2508a53dda46aca480c8d0637a60262d19ccdb2d547d7d3b76'
$PostgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.132'
$Root = Split-Path -Parent $PSScriptRoot
$MigrationDirectory = Join-Path $Root 'supabase\migrations'
$CheckDirectory = Join-Path $PSScriptRoot 'sql'
$MigrationPath = Join-Path $MigrationDirectory $MigrationName
$PoolerPath = Join-Path $Root 'supabase\.temp\pooler-url'
$LinkedProjectPath = Join-Path $Root 'supabase\.temp\linked-project.json'
$CompletionPath = Join-Path $Root 'references\verification\icon-request-hosted-migration-completion-2026-07-27.json'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Invoke-PsqlFiles {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$ContainerPaths,

    [switch]$SingleTransaction
  )

  $arguments = @(
    'run',
    '--rm',
    '-i',
    '-e',
    'PGPASSWORD',
    '--mount',
    "type=bind,source=$MigrationDirectory,target=/migrations,readonly",
    '--mount',
    "type=bind,source=$CheckDirectory,target=/checks,readonly",
    $PostgresImage,
    'psql',
    $script:DatabaseUrl,
    '-X',
    '-v',
    'ON_ERROR_STOP=1'
  )
  if ($SingleTransaction) {
    $arguments += '--single-transaction'
  }
  foreach ($containerPath in $ContainerPaths) {
    $arguments += @('-f', $containerPath)
  }

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $lines = @(& docker @arguments 2>&1)
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }

  $lines | ForEach-Object { Write-Host "$_" }
  if ($exitCode -ne 0) {
    throw "PostgreSQL command failed for $($ContainerPaths -join ', ')"
  }
  return @($lines | ForEach-Object { "$_" })
}

function Invoke-SupabaseTextCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $lines = @(& $script:SupabaseCli @Arguments 2>&1)
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

function Assert-WorktreeContainsOnlyKnownDecisionChange {
  $status = @(git status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not inspect the Git worktree.'
  }

  $unexpected = @($status | Where-Object {
    "$_" -ne ' M docs/si-v2/search/decisions.md'
  })
  if ($unexpected.Count -gt 0) {
    throw "Release worktree contains uncommitted changes: $($unexpected -join '; ')"
  }
}

if (-not $Execute) {
  throw 'Pass -Execute only for the fingerprinted icon request migration packet.'
}

Set-Location $Root

if (Test-Path -LiteralPath $CompletionPath) {
  throw "This packet is write-once and completion evidence already exists: $CompletionPath"
}
if (-not (Test-Path -LiteralPath $MigrationPath)) {
  throw "Migration file is missing: $MigrationPath"
}
if (-not (Test-Path -LiteralPath $PoolerPath)) {
  throw 'Linked Supabase pooler information is missing. Run supabase link first.'
}
try {
  $script:SupabaseCli = (Get-Command supabase -ErrorAction Stop).Source
}
catch {
  throw 'Supabase CLI is unavailable on PATH.'
}

Assert-LinkedProject
Assert-WorktreeContainsOnlyKnownDecisionChange

$actualMigrationHash = (Get-FileHash -LiteralPath $MigrationPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualMigrationHash -ne $ExpectedMigrationHash) {
  throw "Migration hash changed. Expected $ExpectedMigrationHash but found $actualMigrationHash."
}

node scripts/verify-icon-request-migration-packet.mjs --fingerprint $ReleaseFingerprint
if ($LASTEXITCODE -ne 0) {
  throw 'The icon request migration packet verifier failed.'
}

npm run verify:icon-request-migration
if ($LASTEXITCODE -ne 0) {
  throw 'The disposable PostgreSQL migration gate failed.'
}

docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker is not available.'
}

$poolerUrl = (Get-Content -LiteralPath $PoolerPath -Raw).Trim()
if (-not $poolerUrl.StartsWith('postgresql://')) {
  throw 'Linked Supabase pooler URL is invalid.'
}
if (-not $poolerUrl.Contains($ProjectRef)) {
  throw 'Linked Supabase pooler URL does not match the pinned project.'
}

$querySeparator = if ($poolerUrl.Contains('?')) { '&' } else { '?' }
$script:DatabaseUrl = "${poolerUrl}${querySeparator}sslmode=require&application_name=supericons_icon_request_migration"
$releaseCommit = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $releaseCommit -notmatch '^[0-9a-f]{40}$') {
  throw 'Could not resolve the release commit.'
}

$securePassword = $null
$plainPassword = $null
$startedAt = [DateTime]::UtcNow.ToString('o')

try {
  if ($env:SUPABASE_DB_PASSWORD) {
    $plainPassword = $env:SUPABASE_DB_PASSWORD
  }
  else {
    $securePassword = Read-Host 'Supabase database password' -AsSecureString
    $plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
  }
  if (-not $plainPassword) {
    throw 'Supabase database password is unavailable.'
  }

  $env:PGPASSWORD = $plainPassword
  $env:SUPABASE_DB_PASSWORD = $plainPassword
  $plainPassword = $null

  Write-Host "PRE-MUTATION project=$ProjectRef migration=$MigrationVersion commit=$releaseCommit"
  $null = Invoke-SupabaseTextCommand -Arguments @('migration', 'list', '--linked')
  $preflight = @(Invoke-PsqlFiles -ContainerPaths @('/checks/icon-request-hosted-preflight.sql'))

  Write-Host "DATABASE-MUTATION applying only $MigrationName"
  $postflight = @(Invoke-PsqlFiles -ContainerPaths @(
    '/checks/icon-request-hosted-transaction-baseline.sql',
    "/migrations/$MigrationName",
    '/checks/icon-request-hosted-postflight.sql'
  ) -SingleTransaction)

  try {
    $null = Invoke-SupabaseTextCommand -Arguments @(
      'migration',
      'repair',
      $MigrationVersion,
      '--status',
      'applied',
      '--linked'
    )
  }
  catch {
    throw "SQL and postflight passed, but exact history marking failed. Do not rerun the SQL. Retry only history marking for $MigrationVersion. $($_.Exception.Message)"
  }

  $historyPostflight = @(
    Invoke-PsqlFiles -ContainerPaths @('/checks/icon-request-hosted-history-postflight.sql')
  )

  $completion = [ordered]@{
    artifact = 'icon_request_hosted_migration_completion'
    release_fingerprint = $ReleaseFingerprint
    release_commit = $releaseCommit
    project_ref = $ProjectRef
    migration_version = $MigrationVersion
    migration_sha256 = $actualMigrationHash
    started_at = $startedAt
    finished_at = [DateTime]::UtcNow.ToString('o')
    preflight = 'pass'
    postflight = 'pass'
    exact_history_mark = 'pass'
    preflight_output = @($preflight)
    postflight_output = @($postflight)
    history_postflight_output = @($historyPostflight)
    rollback_sql = 'scripts/sql/icon-request-hosted-operational-rollback.sql'
  }

  [System.IO.File]::WriteAllText(
    $CompletionPath,
    "$(ConvertTo-Json $completion -Depth 6)`n",
    $Utf8NoBom
  )

  Write-Host "DATABASE-COMPLETE project=$ProjectRef migration=$MigrationVersion commit=$releaseCommit"
}
finally {
  $plainPassword = $null
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Variable securePassword -ErrorAction SilentlyContinue
}
