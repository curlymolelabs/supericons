param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$ApprovalFingerprint,

  [switch]$Execute,

  [ValidateSet('visible', 'absent', 'unknown')]
  [string]$DiskIoBannerObserved = 'unknown'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRef = 'kcjmkakdhsqplvasgkjv'
$FunctionName = 'admin-api'
$AdminUrl = "https://$ProjectRef.supabase.co/functions/v1/$FunctionName"
$SearchUrl = "https://$ProjectRef.supabase.co/functions/v1/mcp-search"
$PreflightMaxLatencyMs = 10000
$PostgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.132'
$Root = Split-Path -Parent $PSScriptRoot
$FingerprintSource = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-fingerprint-2026-07-16.txt'
$PoolerPath = Join-Path $Root 'supabase/.temp/pooler-url'
$LinkedProjectPath = Join-Path $Root 'supabase/.temp/linked-project.json'
$SqlDirectory = Join-Path $PSScriptRoot 'sql'
$Workspace = Join-Path $Root 'tmp/admin-dashboard-phase-a-admin-api-release'
$RailwayProtectionEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-railway-protection-2026-07-17.json'
$DatabaseHealthEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-database-health-2026-07-17.json'
$SearchHealthEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-search-health-2026-07-17.json'
$BacklogEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-backlog-2026-07-17.json'
$PreflightEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-preflight-2026-07-17.json'
$LiveEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-live-2026-07-17.json'
$CompletionEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-completion-2026-07-17.json'
$RollbackEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-rollback-2026-07-17.json'
$RollbackFailureEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-rollback-failure-2026-07-17.json'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE."
  }
}

function Invoke-JsonCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $lines = @(& $FilePath @Arguments 2>&1)
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($exitCode -ne 0) {
    throw "$FilePath failed with exit code $exitCode. $($lines -join ' ')"
  }
  $jsonLines = @($lines | Where-Object { $_ -is [string] })
  return ($jsonLines -join "`n") | ConvertFrom-Json
}

function Write-JsonEvidence {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][object]$Value
  )

  if (Test-Path -LiteralPath $Path) {
    throw "Evidence path already exists: $Path"
  }
  [System.IO.File]::WriteAllText(
    $Path,
    "$(ConvertTo-Json $Value -Depth 12)`n",
    $Utf8NoBom
  )
}

function Read-FingerprintFields {
  if (-not (Test-Path -LiteralPath $FingerprintSource)) {
    throw "Missing fingerprint source: $FingerprintSource"
  }
  $fields = @{}
  foreach ($line in Get-Content -LiteralPath $FingerprintSource) {
    if (-not $line) { continue }
    $separator = $line.IndexOf('=')
    if ($separator -lt 1) { throw "Malformed fingerprint line: $line" }
    $fields[$line.Substring(0, $separator)] = $line.Substring($separator + 1)
  }
  return $fields
}

function Assert-LinkedProject {
  if (-not (Test-Path -LiteralPath $LinkedProjectPath)) {
    throw 'Linked Supabase project metadata is missing.'
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

function Get-FunctionName {
  param([Parameter(Mandatory = $true)][object]$Function)
  if ($Function.PSObject.Properties.Name -contains 'name') { return "$($Function.name)" }
  if ($Function.PSObject.Properties.Name -contains 'slug') { return "$($Function.slug)" }
  return ''
}

function Get-AdminFunction {
  $parsedFunctions = Invoke-JsonCommand -FilePath 'supabase' -Arguments @(
    'functions', 'list', '--project-ref', $ProjectRef, '--output', 'json'
  )
  $functions = @($parsedFunctions | ForEach-Object { $_ })
  $match = @($functions | Where-Object { (Get-FunctionName $_) -eq $FunctionName })
  if ($match.Count -ne 1) {
    throw "Expected exactly one $FunctionName function, found $($match.Count)."
  }
  return $match[0]
}

function Assert-FunctionState {
  param(
    [Parameter(Mandatory = $true)][object]$Function,
    [Parameter(Mandatory = $true)][string]$ExpectedId,
    [Parameter(Mandatory = $true)][int]$MinimumVersion
  )

  if ("$($Function.id)" -ne $ExpectedId) {
    throw "Function id drifted. Expected $ExpectedId, received $($Function.id)."
  }
  if ([int]$Function.version -lt $MinimumVersion) {
    throw "Function version did not advance to at least $MinimumVersion."
  }
  if ("$($Function.status)".ToUpperInvariant() -notin @('ACTIVE', 'READY')) {
    throw "Function is not active: $($Function.status)."
  }
  if ("$($Function.verify_jwt)".ToLowerInvariant() -ne 'false') {
    throw "Function verify_jwt must remain false, received $($Function.verify_jwt)."
  }
}

function Wait-ForFunctionVersion {
  param(
    [Parameter(Mandatory = $true)][string]$ExpectedId,
    [Parameter(Mandatory = $true)][int]$MinimumVersion
  )

  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    $function = Get-AdminFunction
    if (
      "$($function.id)" -eq $ExpectedId -and
      [int]$function.version -ge $MinimumVersion -and
      "$($function.status)".ToUpperInvariant() -in @('ACTIVE', 'READY')
    ) {
      Assert-FunctionState `
        -Function $function `
        -ExpectedId $ExpectedId `
        -MinimumVersion $MinimumVersion
      return $function
    }
    Start-Sleep -Seconds 2
  }
  throw "Timed out waiting for $FunctionName version $MinimumVersion."
}

function Expand-GitRevision {
  param(
    [Parameter(Mandatory = $true)][string]$Revision,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  New-Item -ItemType Directory -Path $Destination | Out-Null
  $archivePath = "$Destination.tar"
  Invoke-CheckedCommand -FilePath 'git' -Arguments @(
    'archive', '--format=tar', '--output', $archivePath, $Revision
  )
  Invoke-CheckedCommand -FilePath 'tar' -Arguments @('-xf', $archivePath, '-C', $Destination)
  Remove-Item -LiteralPath $archivePath
}

function Deploy-Revision {
  param(
    [Parameter(Mandatory = $true)][string]$Revision,
    [Parameter(Mandatory = $true)][string]$Kind,
    [Parameter(Mandatory = $true)][string]$ExpectedId,
    [Parameter(Mandatory = $true)][int]$PreviousVersion
  )

  $sourcePath = Join-Path $Workspace $Kind
  Expand-GitRevision -Revision $Revision -Destination $sourcePath
  $deployLog = Join-Path $Workspace "$Kind-deploy.log"
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = @(& supabase functions deploy $FunctionName `
    --project-ref $ProjectRef --no-verify-jwt --use-api --workdir $sourcePath 2>&1)
  $deployExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  [System.IO.File]::WriteAllText($deployLog, "$($output -join "`n")`n", $Utf8NoBom)
  if ($deployExitCode -ne 0) {
    throw "Supabase function deploy for $Kind failed. See $deployLog."
  }
  return Wait-ForFunctionVersion -ExpectedId $ExpectedId -MinimumVersion ($PreviousVersion + 1)
}

function Invoke-PsqlPostflight {
  $arguments = @(
    'run', '--rm', '-i', '-e', 'PGPASSWORD',
    '-e', 'PGOPTIONS=-c default_transaction_read_only=on',
    '--mount', "type=bind,source=$SqlDirectory,target=/checks,readonly",
    $PostgresImage,
    'psql', $script:DatabaseUrl, '-X', '-v', 'ON_ERROR_STOP=1',
    '-f', '/checks/admin-dashboard-phase-a-recovery-postflight.sql'
  )
  & docker @arguments
  if ($LASTEXITCODE -ne 0) {
    throw 'The live Phase A schema postflight failed.'
  }
}

function Invoke-PsqlRollupBacklog {
  $arguments = @(
    'run', '--rm', '-i', '-e', 'PGPASSWORD',
    '-e', 'PGOPTIONS=-c default_transaction_read_only=on',
    '--mount', "type=bind,source=$SqlDirectory,target=/checks,readonly",
    $PostgresImage,
    'psql', $script:DatabaseUrl, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
    '-f', '/checks/admin-dashboard-phase-a-rollup-backlog.sql'
  )
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = @(& docker @arguments 2>&1)
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($exitCode -ne 0) {
    throw "The read-only rollup backlog check failed with exit code $exitCode. $($output -join ' ')"
  }
  $jsonLine = @($output | Where-Object {
    $_ -is [string] -and $_.Trim().StartsWith('{') -and $_.Trim().EndsWith('}')
  })
  if ($jsonLine.Count -ne 1) {
    throw "Expected one JSON row from the rollup backlog check, received $($jsonLine.Count)."
  }
  try {
    return $jsonLine[0] | ConvertFrom-Json
  }
  catch {
    throw "The rollup backlog check returned invalid JSON. $($_.Exception.Message)"
  }
}

function Invoke-PsqlMeasuredHealth {
  $rawOutputPath = Join-Path $Workspace 'database-health-psql.txt'
  $arguments = @(
    'run', '--rm', '-i', '-e', 'PGPASSWORD',
    '-e', 'PGOPTIONS=-c default_transaction_read_only=on',
    '--mount', "type=bind,source=$SqlDirectory,target=/checks,readonly",
    $PostgresImage,
    'psql', $script:DatabaseUrl, '-X', '-v', 'ON_ERROR_STOP=1',
    '-f', '/checks/admin-dashboard-phase-a-measured-health.sql'
  )
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = @(& docker @arguments 2>&1)
  $psqlExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  [System.IO.File]::WriteAllText($rawOutputPath, "$($output -join "`n")`n", $Utf8NoBom)

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $parserOutput = @(& node 'scripts/admin-dashboard-phase-a-db-health-parser.mjs' `
    --input $rawOutputPath `
    --output $DatabaseHealthEvidence `
    --approval-fingerprint $ApprovalFingerprint `
    --sql-exit-code "$psqlExitCode" 2>&1)
  $parserExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($parserExitCode -ne 0) {
    throw "The measured read-only database health gate blocked. $($parserOutput -join ' ')"
  }
  return Get-Content -LiteralPath $DatabaseHealthEvidence -Raw | ConvertFrom-Json
}

function Invoke-StrictSearchHealth {
  Invoke-CheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-admin-dashboard-phase-a-search-health.mjs',
    '--search-url', $SearchUrl,
    '--output', 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-search-health-2026-07-17.json',
    '--warmup-count', '1',
    '--measured-count', '2',
    '--latency-limit-ms', '2000',
    '--request-timeout-ms', '5000'
  )
  $evidence = Get-Content -LiteralPath $SearchHealthEvidence -Raw | ConvertFrom-Json
  if ($evidence.status -ne 'ok') {
    throw 'The strict production search health gate blocked.'
  }
  return $evidence
}

function Invoke-AdminLiveGate {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('preflight', 'legacy', 'candidate')][string]$Mode,
    [Parameter(Mandatory = $true)][string]$OutputPath,
    [int]$MaxRefreshDays = 0
  )

  $arguments = @(
    'scripts/verify-admin-dashboard-phase-a-admin-api-live.mjs',
    '--admin-url', $AdminUrl,
    '--mode', $Mode,
    '--output', $OutputPath
  )
  if ($Mode -eq 'candidate') {
    $arguments += @('--max-refresh-days', "$MaxRefreshDays")
  }
  if ($Mode -eq 'preflight') {
    $arguments += @('--preflight-max-latency-ms', "$PreflightMaxLatencyMs")
  }
  Invoke-CheckedCommand -FilePath 'node' -Arguments $arguments
  $evidence = Get-Content -LiteralPath (Join-Path $Root $OutputPath) -Raw | ConvertFrom-Json
  $allowedStatuses = @('ok')
  if ($allowedStatuses -notcontains $evidence.status) {
    throw "The $Mode admin API live contract failed."
  }
  return $evidence
}

function Invoke-Rollback {
  param(
    [Parameter(Mandatory = $true)][string]$Reason,
    [Parameter(Mandatory = $true)][object]$CandidateFunction
  )

  $rollbackStartedAt = (Get-Date).ToUniversalTime().ToString('o')
  $rollbackFunction = Deploy-Revision `
    -Revision $script:Packet.rollback_revision `
    -Kind 'rollback' `
    -ExpectedId "$($CandidateFunction.id)" `
    -PreviousVersion ([int]$CandidateFunction.version)
  $rollbackLivePath = 'tmp/admin-dashboard-phase-a-admin-api-release/rollback-live.json'
  try {
    $rollbackLive = Invoke-AdminLiveGate -Mode legacy -OutputPath $rollbackLivePath
  }
  catch {
    $rollbackError = $_.Exception.Message
    $rollbackLive = $null
    $absoluteRollbackLivePath = Join-Path $Root $rollbackLivePath
    if (Test-Path -LiteralPath $absoluteRollbackLivePath) {
      try {
        $rollbackLive = Get-Content -LiteralPath $absoluteRollbackLivePath -Raw | ConvertFrom-Json
      }
      catch {
        $rollbackLive = [ordered]@{
          status = 'unreadable'
          error = $_.Exception.Message
        }
      }
    }
    $rollbackHttpStatus = if ($rollbackLive -and $rollbackLive.PSObject.Properties.Name -contains 'http_status') {
      [int]$rollbackLive.http_status
    } else {
      $null
    }
    $hasEnvironmentalSignature = (
      $rollbackError -match '(?i)timeout|timed out|aborted|HTTP\s+5\d\d' -or
      ($null -ne $rollbackHttpStatus -and $rollbackHttpStatus -ge 500)
    )
    Write-JsonEvidence -Path $RollbackFailureEvidence -Value ([ordered]@{
      artifact = 'admin_dashboard_phase_a_admin_api_rollback_verification_failure'
      approval_fingerprint = $ApprovalFingerprint
      outcome = 'rollback_source_active_but_legacy_contract_failed'
      reason = $Reason
      candidate_version = [int]$CandidateFunction.version
      rollback_revision = $script:Packet.rollback_revision
      rollback_tree = $script:Packet.rollback_tree
      rollback_version = [int]$rollbackFunction.version
      rollback_updated_at = $rollbackFunction.updated_at
      rollback_live_contract = $rollbackLive
      rollback_verification_error = $rollbackError
      environmental_signature = if ($hasEnvironmentalSignature) { 'possible_shared_database_degradation' } else { 'not_identified' }
      disk_io_banner_observed_before_execution = $DiskIoBannerObserved
      disk_io_banner_is_gate = $false
      code_restoration = 'exact_pinned_revision_deployed_and_active'
      service_restoration = 'not_verified'
      started_at = $rollbackStartedAt
      finished_at = (Get-Date).ToUniversalTime().ToString('o')
    })
    throw "Rollback source is active at version $($rollbackFunction.version), but its strict legacy contract failed. $rollbackError"
  }
  Write-JsonEvidence -Path $RollbackEvidence -Value ([ordered]@{
    artifact = 'admin_dashboard_phase_a_admin_api_rollback'
    approval_fingerprint = $ApprovalFingerprint
    reason = $Reason
    candidate_version = [int]$CandidateFunction.version
    rollback_revision = $script:Packet.rollback_revision
    rollback_version = [int]$rollbackFunction.version
    rollback_updated_at = $rollbackFunction.updated_at
    legacy_contract = $rollbackLive
    started_at = $rollbackStartedAt
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
}

if (-not $Execute) {
  throw 'Pass -Execute only after independent audit has cleared the exact packet fingerprint.'
}

Set-Location $Root
$script:Packet = Read-FingerprintFields
Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-admin-dashboard-phase-a-admin-api-packet.mjs',
  '--fingerprint', $ApprovalFingerprint
)

foreach ($revisionField in @('implementation_revision', 'rollback_revision')) {
  if ((git rev-parse $script:Packet[$revisionField]) -ne $script:Packet[$revisionField]) {
    throw "The $revisionField revision is unavailable."
  }
}
if ((git rev-parse "$($script:Packet.implementation_revision)`^{tree}") -ne $script:Packet.implementation_tree) {
  throw 'The implementation tree does not match the packet.'
}
if ((git rev-parse "$($script:Packet.rollback_revision)`^{tree}") -ne $script:Packet.rollback_tree) {
  throw 'The rollback tree does not match the packet.'
}

foreach ($path in @($RailwayProtectionEvidence, $DatabaseHealthEvidence, $SearchHealthEvidence, $BacklogEvidence, $PreflightEvidence, $LiveEvidence, $CompletionEvidence, $RollbackEvidence, $RollbackFailureEvidence)) {
  if (Test-Path -LiteralPath $path) {
    throw "This packet is write-once and evidence already exists: $path"
  }
}
Assert-LinkedProject
if (-not (Test-Path -LiteralPath $PoolerPath)) {
  throw 'Linked Supabase pooler information is missing.'
}

$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
$resolvedWorkspace = [System.IO.Path]::GetFullPath($Workspace)
if (-not $resolvedWorkspace.StartsWith("$resolvedRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'The admin API release workspace is outside the repository root.'
}
if (Test-Path -LiteralPath $Workspace) {
  Remove-Item -LiteralPath $Workspace -Recurse -Force
}
New-Item -ItemType Directory -Path $Workspace | Out-Null

Invoke-CheckedCommand -FilePath 'deno' -Arguments @('check', 'supabase/functions/admin-api/index.ts')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-a-metrics.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-a-api.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-a-rollup-refresh-gate.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-a-db-health-parser.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-a-search-health-local.mjs')

$preFunction = Get-AdminFunction
Assert-FunctionState `
  -Function $preFunction `
  -ExpectedId $script:Packet.pre_function_id `
  -MinimumVersion ([int]$script:Packet.pre_function_version)
if ([int]$preFunction.version -ne [int]$script:Packet.pre_function_version) {
  throw "Function version drifted from $($script:Packet.pre_function_version) to $($preFunction.version)."
}
if ("$($preFunction.updated_at)" -ne $script:Packet.pre_function_updated_at) {
  throw 'Function update timestamp drifted from the approved packet.'
}

Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-admin-dashboard-phase-a-railway-live.mjs',
  '--mcp-url', 'https://mcp.supericons.dev/mcp',
  '--expect-version', '0.4.18',
  '--expect-material-assets', '8524',
  '--expect-hosted-search-resilience', 'enabled',
  '--allow-active',
  '--output', 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-railway-protection-2026-07-17.json'
)
$railwayProtection = Get-Content -LiteralPath $RailwayProtectionEvidence -Raw | ConvertFrom-Json

$poolerUrl = (Get-Content -LiteralPath $PoolerPath -Raw).Trim()
if (-not $poolerUrl.StartsWith('postgresql://')) {
  throw 'Linked Supabase pooler URL is invalid.'
}
if (-not $poolerUrl.Contains($ProjectRef)) {
  throw 'Linked Supabase pooler URL does not match the approved project.'
}
$querySeparator = if ($poolerUrl.Contains('?')) { '&' } else { '?' }
$script:DatabaseUrl = "${poolerUrl}${querySeparator}sslmode=require&application_name=supericons_admin_dashboard_phase_a_admin_api"
$databasePassword = Read-Host 'Supabase database password' -AsSecureString
$adminSecret = Read-Host 'Supabase ADMIN_SECRET' -AsSecureString
$script:CandidateWentLive = $false
$script:CandidateFunction = $null
$startedAt = (Get-Date).ToUniversalTime().ToString('o')

try {
  $plainDatabasePassword = [System.Net.NetworkCredential]::new('', $databasePassword).Password
  $plainAdminSecret = [System.Net.NetworkCredential]::new('', $adminSecret).Password
  $env:PGPASSWORD = $plainDatabasePassword
  $env:PHASE_A_ADMIN_SECRET = $plainAdminSecret
  $plainDatabasePassword = $null
  $plainAdminSecret = $null

  docker info --format '{{.ServerVersion}}' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Docker is not available.' }
  Invoke-PsqlPostflight
  $databaseHealth = Invoke-PsqlMeasuredHealth
  $backlog = Invoke-PsqlRollupBacklog
  $pendingDayCount = [int]$backlog.pending_day_count
  $refreshDayLimit = $pendingDayCount
  if ($pendingDayCount -lt 0 -or $pendingDayCount -gt [int]$script:Packet.rollup_refresh_days_max) {
    throw "Measured rollup backlog $pendingDayCount is outside the approved range 0 to $($script:Packet.rollup_refresh_days_max)."
  }
  if ([int]$backlog.pending_on_or_before_latest_complete_day -ne 0) {
    throw 'The rollup tables contain a historical gap that the sequential refresh API cannot safely repair.'
  }
  Write-JsonEvidence -Path $BacklogEvidence -Value ([ordered]@{
    artifact = 'admin_dashboard_phase_a_admin_api_rollup_backlog'
    approval_fingerprint = $ApprovalFingerprint
    measurement = $backlog
    refresh_day_limit = $refreshDayLimit
    refresh_call_limit = $refreshDayLimit + 1
    authorized_max_pending_days = [int]$script:Packet.rollup_refresh_days_max
    mutations = 0
    captured_at = (Get-Date).ToUniversalTime().ToString('o')
  })
  $preflight = Invoke-AdminLiveGate `
    -Mode preflight `
    -OutputPath 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-preflight-2026-07-17.json'
  $searchHealth = Invoke-StrictSearchHealth

  $candidate = Deploy-Revision `
    -Revision $script:Packet.implementation_revision `
    -Kind 'candidate' `
    -ExpectedId "$($preFunction.id)" `
    -PreviousVersion ([int]$preFunction.version)
  $script:CandidateFunction = $candidate
  $script:CandidateWentLive = $true

  $live = Invoke-AdminLiveGate `
    -Mode candidate `
    -OutputPath 'references/verification/admin-dashboard-phase-a-admin-api-recovery-2y-live-2026-07-17.json' `
    -MaxRefreshDays $pendingDayCount

  Write-JsonEvidence -Path $CompletionEvidence -Value ([ordered]@{
    artifact = 'admin_dashboard_phase_a_admin_api_completion'
    approval_fingerprint = $ApprovalFingerprint
    implementation_revision = $script:Packet.implementation_revision
    pre_function_id = "$($preFunction.id)"
    pre_function_version = [int]$preFunction.version
    candidate_function_version = [int]$candidate.version
    candidate_updated_at = $candidate.updated_at
    rollup_backlog = $backlog
    railway_protection = $railwayProtection
    database_measured_health = $databaseHealth
    strict_search_health = $searchHealth
    preflight = $preflight
    preflight_max_latency_ms = $PreflightMaxLatencyMs
    disk_io_banner_observed_before_execution = $DiskIoBannerObserved
    disk_io_banner_is_gate = $false
    live_contract = $live
    rollback_used = $false
    started_at = $startedAt
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
  Write-Host "Admin API Phase A release completed at function version $($candidate.version)."
} catch {
  $failure = $_.Exception.Message
  if ($script:CandidateWentLive -and $script:CandidateFunction) {
    try {
      Invoke-Rollback -Reason $failure -CandidateFunction $script:CandidateFunction
    } catch {
      throw "Candidate verification failed. Rollback also failed or could not be verified. $($_.Exception.Message) Original failure: $failure"
    }
    throw "Candidate verification failed and rollback completed. Original failure: $failure"
  }
  throw
} finally {
  $plainDatabasePassword = $null
  $plainAdminSecret = $null
  Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:PHASE_A_ADMIN_SECRET -ErrorAction SilentlyContinue
  Remove-Variable databasePassword -ErrorAction SilentlyContinue
  Remove-Variable adminSecret -ErrorAction SilentlyContinue
}
