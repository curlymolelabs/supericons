param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{40}$')]
  [string]$ReleaseCommit,

  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRef = 'kcjmkakdhsqplvasgkjv'
$MigrationVersion = '20260805120000'
$MigrationName = '20260805120000_website_icon_popularity.sql'
$ExpectedMigrationHash = '105c016c08f9dbde830d0521917950ba43831a43dbef1a8a4a4f65d7372d55b6'
$ScheduleName = 'website-popularity-schedule-activation-2026-08-05.sql'
$ExpectedScheduleHash = '5df29215d22ba3a1564c8687d6e7f009d778f8690b8978d5548cc74ed66f7446'
$PostgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.132'
$Root = Split-Path -Parent $PSScriptRoot
$MigrationDirectory = Join-Path $Root 'supabase\migrations'
$CheckDirectory = Join-Path $PSScriptRoot 'sql'
$DocsDirectory = Join-Path $Root 'docs\si-v2\search'
$MigrationPath = Join-Path $MigrationDirectory $MigrationName
$SchedulePath = Join-Path $DocsDirectory $ScheduleName
$PoolerPath = Join-Path $Root 'supabase\.temp\pooler-url'
$LinkedProjectPath = Join-Path $Root 'supabase\.temp\linked-project.json'
$ReleaseDirectory = Join-Path $Root '.tmp\website-popularity-release'
$CompletionPath = Join-Path $ReleaseDirectory 'database-completion.json'
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
    '--mount',
    "type=bind,source=$DocsDirectory,target=/docs,readonly",
    '--mount',
    "type=bind,source=$ReleaseDirectory,target=/release,readonly",
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
    throw 'Linked Supabase project metadata is missing.'
  }

  $linkedProject = Get-Content -LiteralPath $LinkedProjectPath -Raw |
    ConvertFrom-Json
  if ("$($linkedProject.ref)" -ne $ProjectRef) {
    throw "Linked project mismatch. Expected $ProjectRef."
  }
}

function Assert-CleanReleaseCommit {
  $currentCommit = (git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or $currentCommit -ne $ReleaseCommit) {
    throw 'The checked out commit does not match ReleaseCommit.'
  }

  $status = @(git status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -ne 0 -or $status.Count -ne 0) {
    throw "Release worktree is not clean: $($status -join '; ')"
  }
}

if (-not $Execute) {
  throw 'Pass -Execute only for the reviewed website popularity release.'
}

Set-Location $Root
Assert-LinkedProject
Assert-CleanReleaseCommit

if (-not (Test-Path -LiteralPath $MigrationPath)) {
  throw "Migration file is missing: $MigrationPath"
}
if (-not (Test-Path -LiteralPath $SchedulePath)) {
  throw "Schedule file is missing: $SchedulePath"
}
if (-not (Test-Path -LiteralPath $PoolerPath)) {
  throw 'Linked Supabase pooler information is missing.'
}

$actualMigrationHash = (
  Get-FileHash -LiteralPath $MigrationPath -Algorithm SHA256
).Hash.ToLowerInvariant()
if ($actualMigrationHash -ne $ExpectedMigrationHash) {
  throw 'Migration fingerprint changed.'
}

$actualScheduleHash = (
  Get-FileHash -LiteralPath $SchedulePath -Algorithm SHA256
).Hash.ToLowerInvariant()
if ($actualScheduleHash -ne $ExpectedScheduleHash) {
  throw 'Schedule fingerprint changed.'
}

$script:SupabaseCli = (Get-Command supabase -ErrorAction Stop).Source
docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker is unavailable.'
}

npm run verify:website-popularity-migration
if ($LASTEXITCODE -ne 0) {
  throw 'The disposable PostgreSQL migration gate failed.'
}

if (Test-Path -LiteralPath $ReleaseDirectory) {
  Remove-Item -LiteralPath $ReleaseDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $ReleaseDirectory | Out-Null
node scripts/sync-website-icon-grid-availability.mjs `
  --release-dir $ReleaseDirectory
if ($LASTEXITCODE -ne 0) {
  throw 'Availability release files could not be generated.'
}

$poolerUrl = (Get-Content -LiteralPath $PoolerPath -Raw).Trim()
$poolerUrlIsPinned = $poolerUrl.StartsWith('postgresql://') -and
  $poolerUrl.Contains($ProjectRef)
if (-not $poolerUrlIsPinned) {
  throw 'Pinned Supabase pooler URL is invalid.'
}
$querySeparator = if ($poolerUrl.Contains('?')) { '&' } else { '?' }
$script:DatabaseUrl = "${poolerUrl}${querySeparator}sslmode=require&application_name=supericons_website_popularity_release"

$securePassword = $null
$plainPassword = $null
$startedAt = [DateTime]::UtcNow.ToString('o')

try {
  if ($env:SUPABASE_DB_PASSWORD) {
    $plainPassword = $env:SUPABASE_DB_PASSWORD
  }
  else {
    $securePassword = Read-Host 'Supabase database password' -AsSecureString
    $plainPassword = [System.Net.NetworkCredential]::new(
      '',
      $securePassword
    ).Password
  }
  if (-not $plainPassword) {
    throw 'Supabase database password is unavailable.'
  }

  $env:PGPASSWORD = $plainPassword
  $plainPassword = $null

  Write-Host "PRE-MUTATION project=$ProjectRef migration=$MigrationVersion commit=$ReleaseCommit"
  $null = Invoke-SupabaseTextCommand -Arguments @(
    'migration',
    'list',
    '--linked'
  )
  $preflight = @(Invoke-PsqlFiles -ContainerPaths @(
    '/checks/website-popularity-hosted-preflight.sql'
  ))

  Write-Host "DATABASE-MUTATION applying only $MigrationName"
  $postflight = @(Invoke-PsqlFiles -ContainerPaths @(
    '/checks/website-popularity-hosted-transaction-baseline.sql',
    "/migrations/$MigrationName",
    '/checks/website-popularity-hosted-postflight.sql'
  ))

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
    throw "Database postflight passed, but exact history marking failed. Retry only the history mark for $MigrationVersion. $($_.Exception.Message)"
  }

  $historyPostflight = @(Invoke-PsqlFiles -ContainerPaths @(
    '/checks/website-popularity-hosted-history-postflight.sql'
  ))

  Write-Host 'DATABASE-INITIALIZATION loading availability, refreshing, and scheduling'
  $releasePostflight = @(Invoke-PsqlFiles -ContainerPaths @(
    '/checks/website-popularity-hosted-initialize.sql',
    "/docs/$ScheduleName",
    '/checks/website-popularity-hosted-release-postflight.sql'
  ) -SingleTransaction)

  $completion = [ordered]@{
    artifact = 'website_popularity_database_completion'
    release_commit = $ReleaseCommit
    project_ref = $ProjectRef
    migration_version = $MigrationVersion
    migration_sha256 = $actualMigrationHash
    schedule_sha256 = $actualScheduleHash
    started_at = $startedAt
    finished_at = [DateTime]::UtcNow.ToString('o')
    preflight = 'pass'
    migration_postflight = 'pass'
    exact_history_mark = 'pass'
    initialization = 'pass'
    schedule = 'pass'
    preflight_output = @($preflight)
    migration_postflight_output = @($postflight)
    history_postflight_output = @($historyPostflight)
    release_postflight_output = @($releasePostflight)
    rollback_sql = 'scripts/sql/website-popularity-hosted-operational-rollback.sql'
  }

  [System.IO.File]::WriteAllText(
    $CompletionPath,
    "$(ConvertTo-Json $completion -Depth 6)`n",
    $Utf8NoBom
  )

  Write-Host "DATABASE-COMPLETE project=$ProjectRef migration=$MigrationVersion commit=$ReleaseCommit"
}
finally {
  $plainPassword = $null
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Variable securePassword -ErrorAction SilentlyContinue
}
