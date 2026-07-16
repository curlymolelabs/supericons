param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$ApprovalFingerprint,

  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRef = 'kcjmkakdhsqplvasgkjv'
$FunctionName = 'admin-api'
$AdminUrl = "https://$ProjectRef.supabase.co/functions/v1/$FunctionName"
$PostgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.132'
$Root = Split-Path -Parent $PSScriptRoot
$FingerprintSource = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-fingerprint-2026-07-16.txt'
$PoolerPath = Join-Path $Root 'supabase/.temp/pooler-url'
$LinkedProjectPath = Join-Path $Root 'supabase/.temp/linked-project.json'
$SqlDirectory = Join-Path $PSScriptRoot 'sql'
$Workspace = Join-Path $Root 'tmp/admin-dashboard-phase-a-admin-api-release'
$PreflightEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-preflight-2026-07-16.json'
$LiveEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-live-2026-07-16.json'
$CompletionEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-completion-2026-07-16.json'
$RollbackEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-admin-api-rollback-2026-07-16.json'
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
    '--mount', "type=bind,source=$SqlDirectory,target=/checks,readonly",
    $PostgresImage,
    'psql', $script:DatabaseUrl, '-X', '-v', 'ON_ERROR_STOP=1',
    '-f', '/checks/admin-dashboard-phase-a-hosted-postflight.sql'
  )
  & docker @arguments
  if ($LASTEXITCODE -ne 0) {
    throw 'The live Phase A schema postflight failed.'
  }
}

function Invoke-AdminLiveGate {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('legacy', 'candidate')][string]$Mode,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  Invoke-CheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-admin-dashboard-phase-a-admin-api-live.mjs',
    '--admin-url', $AdminUrl,
    '--mode', $Mode,
    '--output', $OutputPath
  )
  $evidence = Get-Content -LiteralPath (Join-Path $Root $OutputPath) -Raw | ConvertFrom-Json
  if ($evidence.status -ne 'ok') {
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
  $rollbackLive = Invoke-AdminLiveGate -Mode legacy -OutputPath $rollbackLivePath
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
  throw 'Pass -Execute only after the owner has approved the exact packet fingerprint.'
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

foreach ($path in @($PreflightEvidence, $LiveEvidence, $CompletionEvidence, $RollbackEvidence)) {
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
  $preflight = Invoke-AdminLiveGate `
    -Mode legacy `
    -OutputPath 'references/verification/admin-dashboard-phase-a-admin-api-preflight-2026-07-16.json'

  $candidate = Deploy-Revision `
    -Revision $script:Packet.implementation_revision `
    -Kind 'candidate' `
    -ExpectedId "$($preFunction.id)" `
    -PreviousVersion ([int]$preFunction.version)
  $script:CandidateFunction = $candidate
  $script:CandidateWentLive = $true

  $live = Invoke-AdminLiveGate `
    -Mode candidate `
    -OutputPath 'references/verification/admin-dashboard-phase-a-admin-api-live-2026-07-16.json'

  Write-JsonEvidence -Path $CompletionEvidence -Value ([ordered]@{
    artifact = 'admin_dashboard_phase_a_admin_api_completion'
    approval_fingerprint = $ApprovalFingerprint
    implementation_revision = $script:Packet.implementation_revision
    pre_function_id = "$($preFunction.id)"
    pre_function_version = [int]$preFunction.version
    candidate_function_version = [int]$candidate.version
    candidate_updated_at = $candidate.updated_at
    preflight = $preflight
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
