param(
  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRef = 'kcjmkakdhsqplvasgkjv'
$FunctionName = 'admin-api'
$AdminUrl = "https://$ProjectRef.supabase.co/functions/v1/$FunctionName"
$SearchUrl = "https://$ProjectRef.supabase.co/functions/v1/mcp-search"
$Root = Split-Path -Parent $PSScriptRoot
$FingerprintSource = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-fingerprint-2026-07-17.txt'
$LinkedProjectPath = Join-Path $Root 'supabase/.temp/linked-project.json'
$Workspace = Join-Path $Root 'tmp/admin-dashboard-v2-rollup-correction-retry'
$PreInventoryEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-pre-inventory-2026-07-17.json'
$DatabaseEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-database-preflight-2026-07-17.json'
$RailwayEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-railway-health-2026-07-17.json'
$SearchEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-search-health-2026-07-17.json'
$LegacyPreflightEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-preflight-2026-07-17.json'
$CandidateInventoryEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-candidate-inventory-2026-07-17.json'
$V2LiveEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-live-2026-07-17.json'
$RollupParityEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-parity-2026-07-17.json'
$PhaseALiveEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-phase-a-regression-2026-07-17.json'
$CompletionEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-completion-2026-07-17.json'
$RollbackInventoryEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-rollback-inventory-2026-07-17.json'
$RollbackEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-rollback-2026-07-17.json'
$RollbackFailureEvidence = Join-Path $Root 'references/verification/admin-dashboard-v2-rollup-correction-retry-rollback-failure-2026-07-17.json'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)
. (Join-Path $PSScriptRoot 'admin-dashboard-release-credentials.ps1')

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

function Invoke-QuietCheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = @(& $FilePath @Arguments 2>&1)
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($exitCode -ne 0) {
    throw "$FilePath failed with exit code $exitCode. $($output -join ' ')"
  }
  return $output
}

function Get-LfSha256 {
  param([Parameter(Mandatory = $true)][string]$Path)
  $text = [System.IO.File]::ReadAllText($Path).Replace("`r`n", "`n")
  if ($text.Contains("`r")) {
    throw "Text contains a bare carriage return: $Path"
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  return ([BitConverter]::ToString(
    $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($text))
  )).Replace('-', '').ToLowerInvariant()
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
    "$(ConvertTo-Json $Value -Depth 16)`n",
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
  $linkedProject = Get-Content -LiteralPath $LinkedProjectPath -Raw | ConvertFrom-Json
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

function Get-Functions {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $lines = @(& supabase functions list --project-ref $ProjectRef --output json 2>&1)
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference
  if ($exitCode -ne 0) {
    throw "Supabase function inventory failed. $($lines -join ' ')"
  }
  $textLines = @($lines | ForEach-Object { "$_" })
  $start = -1
  $finish = -1
  for ($index = 0; $index -lt $textLines.Count; $index += 1) {
    if ($start -lt 0 -and $textLines[$index].Trim() -eq '[') {
      $start = $index
    }
    if ($start -ge 0 -and $textLines[$index].Trim() -eq ']') {
      $finish = $index
    }
  }
  if ($start -lt 0 -or $finish -lt $start) {
    throw 'Supabase function inventory did not contain a JSON array.'
  }
  return @((($textLines[$start..$finish] -join "`n") | ConvertFrom-Json) | ForEach-Object { $_ })
}

function Get-NamedFunction {
  param(
    [Parameter(Mandatory = $true)][object[]]$Functions,
    [Parameter(Mandatory = $true)][string]$Name
  )
  $matches = @($Functions | Where-Object { (Get-FunctionName $_) -eq $Name })
  if ($matches.Count -ne 1) {
    throw "Expected exactly one $Name function, found $($matches.Count)."
  }
  return $matches[0]
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
    $functions = Get-Functions
    $function = Get-NamedFunction -Functions $functions -Name $FunctionName
    if (
      "$($function.id)" -eq $ExpectedId -and
      [int]$function.version -ge $MinimumVersion -and
      "$($function.status)".ToUpperInvariant() -in @('ACTIVE', 'READY')
    ) {
      Assert-FunctionState -Function $function -ExpectedId $ExpectedId -MinimumVersion $MinimumVersion
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
    throw "Supabase function deploy for $Kind failed. See the retained deploy log."
  }
  if ($Kind -eq 'candidate') {
    $script:CandidateDeploySubmitted = $true
  }
  return Wait-ForFunctionVersion -ExpectedId $ExpectedId -MinimumVersion ($PreviousVersion + 1)
}

function Invoke-Inventory {
  param([Parameter(Mandatory = $true)][string]$Output)
  $null = Invoke-QuietCheckedCommand -FilePath 'powershell' -Arguments @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', 'scripts/capture-admin-dashboard-phase-a-admin-api-inventory.ps1',
    '-Output', $Output
  )
  return Get-Content -LiteralPath (Join-Path $Root $Output) -Raw | ConvertFrom-Json
}

function Invoke-NodeEvidenceGate {
  param(
    [Parameter(Mandatory = $true)][string]$Script,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$Output
  )
  $nodeArguments = @($Script) + $Arguments
  $null = Invoke-QuietCheckedCommand -FilePath 'node' -Arguments $nodeArguments
  $evidence = Get-Content -LiteralPath (Join-Path $Root $Output) -Raw | ConvertFrom-Json
  if ($evidence.status -ne 'ok') {
    throw "$Script did not pass."
  }
  return $evidence
}

function Assert-InventoryRevision {
  param(
    [Parameter(Mandatory = $true)][object]$Inventory,
    [Parameter(Mandatory = $true)][string]$ExpectedRevision
  )
  if (-not $Inventory.source_download.succeeded) {
    throw 'The live admin-api source download failed.'
  }
  if (@($Inventory.source_download.matching_git_revisions) -notcontains $ExpectedRevision) {
    throw "The live admin-api source does not match revision $ExpectedRevision."
  }
}

function Invoke-Rollback {
  param(
    [Parameter(Mandatory = $true)][string]$Reason,
    [Parameter(Mandatory = $true)][object]$CandidateFunction
  )
  $rollbackStartedAt = (Get-Date).ToUniversalTime().ToString('o')
  try {
    $rollbackFunction = Deploy-Revision `
      -Revision $script:Packet.rollback_revision `
      -Kind 'rollback' `
      -ExpectedId "$($CandidateFunction.id)" `
      -PreviousVersion ([int]$CandidateFunction.version)
    $rollbackInventory = Invoke-Inventory `
      -Output 'references/verification/admin-dashboard-v2-rollup-correction-retry-rollback-inventory-2026-07-17.json'
    Assert-InventoryRevision -Inventory $rollbackInventory -ExpectedRevision $script:Packet.rollback_revision
    $rollbackLive = Invoke-NodeEvidenceGate `
      -Script 'scripts/verify-admin-dashboard-phase-a-admin-api-live.mjs' `
      -Arguments @(
        '--admin-url', $AdminUrl,
        '--mode', 'legacy',
        '--output', 'tmp/admin-dashboard-v2-rollup-correction-retry/rollback-live.json'
      ) `
      -Output 'tmp/admin-dashboard-v2-rollup-correction-retry/rollback-live.json'
    Write-JsonEvidence -Path $RollbackEvidence -Value ([ordered]@{
      artifact = 'admin_dashboard_v2_rollup_correction_retry_rollback'
      release_fingerprint = $script:ReleaseFingerprint
      reason = $Reason.Replace($Root, '[workspace]')
      candidate_version = [int]$CandidateFunction.version
      rollback_revision = $script:Packet.rollback_revision
      rollback_version = [int]$rollbackFunction.version
      rollback_updated_at = "$($rollbackFunction.updated_at)"
      rollback_source_sha256 = $rollbackInventory.source_download.index_sha256
      legacy_stats_latency_ms = $rollbackLive.legacy_stats_latency_ms
      status = 'ok'
      started_at = $rollbackStartedAt
      finished_at = (Get-Date).ToUniversalTime().ToString('o')
    })
  }
  catch {
    $rollbackFailure = $_.Exception.Message.Replace($Root, '[workspace]')
    Write-JsonEvidence -Path $RollbackFailureEvidence -Value ([ordered]@{
      artifact = 'admin_dashboard_v2_rollup_correction_retry_rollback_failure'
      release_fingerprint = $script:ReleaseFingerprint
      original_reason = $Reason.Replace($Root, '[workspace]')
      rollback_error = $rollbackFailure
      status = 'failed'
      started_at = $rollbackStartedAt
      finished_at = (Get-Date).ToUniversalTime().ToString('o')
    })
    throw "Candidate verification failed and rollback verification failed. $rollbackFailure"
  }
}

if (-not $Execute) {
  throw 'Pass -Execute to run the already authorized bounded release.'
}

Set-Location $Root
if (@(git status --porcelain).Count -ne 0) {
  throw 'The V2 release worktree must be clean before execution.'
}
Assert-LinkedProject

$script:ReleaseFingerprint = Get-LfSha256 -Path $FingerprintSource
$script:Packet = Read-FingerprintFields
Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-admin-dashboard-v2-release-packet.mjs',
  '--fingerprint', $script:ReleaseFingerprint
)

foreach ($revisionField in @('implementation_revision', 'rollback_revision')) {
  if ((git rev-parse $script:Packet[$revisionField]) -ne $script:Packet[$revisionField]) {
    throw "The $revisionField revision is unavailable."
  }
}
if ((git rev-parse "$($script:Packet.implementation_revision)`^{tree}") -ne $script:Packet.implementation_tree) {
  throw 'The implementation tree does not match the release packet.'
}
if ((git rev-parse "$($script:Packet.rollback_revision)`^{tree}") -ne $script:Packet.rollback_tree) {
  throw 'The rollback tree does not match the release packet.'
}

$evidencePaths = @(
  $PreInventoryEvidence,
  $DatabaseEvidence,
  $RailwayEvidence,
  $SearchEvidence,
  $LegacyPreflightEvidence,
  $CandidateInventoryEvidence,
  $V2LiveEvidence,
  $RollupParityEvidence,
  $PhaseALiveEvidence,
  $CompletionEvidence,
  $RollbackInventoryEvidence,
  $RollbackEvidence,
  $RollbackFailureEvidence
)
foreach ($path in $evidencePaths) {
  if (Test-Path -LiteralPath $path) {
    throw "This release is write-once and evidence already exists: $path"
  }
}

$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
$resolvedWorkspace = [System.IO.Path]::GetFullPath($Workspace)
if (-not $resolvedWorkspace.StartsWith("$resolvedRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'The release workspace is outside the repository root.'
}
if (Test-Path -LiteralPath $Workspace) {
  Remove-Item -LiteralPath $Workspace -Recurse -Force
}
New-Item -ItemType Directory -Path $Workspace | Out-Null

Invoke-CheckedCommand -FilePath 'deno' -Arguments @('check', 'supabase/functions/admin-api/index.ts')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-v2-helpers.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-v2-api.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('--check', 'scripts/verify-admin-dashboard-v2-rollup-parity.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-a-metrics.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-a-api.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-a-cache.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-b.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-admin-dashboard-phase-b-browser.mjs')
Invoke-CheckedCommand -FilePath 'powershell' -Arguments @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-File', 'scripts/verify-admin-dashboard-release-credentials.ps1'
)

$credentialStates = @()
$script:CandidateDeploySubmitted = $false
$script:CandidateFunction = $null
$preFunction = $null
try {
  $credentialStates += Set-AdminDashboardReleaseProcessCredential `
    -SourceName SUPABASE_ACCESS_TOKEN `
    -TargetName SUPABASE_ACCESS_TOKEN
  $credentialStates += Set-AdminDashboardReleaseProcessCredential `
    -SourceName ADMIN_SECRET `
    -TargetName PHASE_A_ADMIN_SECRET

  $functionsBefore = Get-Functions
  $preFunction = Get-NamedFunction -Functions $functionsBefore -Name $FunctionName
  $preMcpSearch = Get-NamedFunction -Functions $functionsBefore -Name 'mcp-search'
  Assert-FunctionState `
    -Function $preFunction `
    -ExpectedId $script:Packet.pre_function_id `
    -MinimumVersion ([int]$script:Packet.pre_function_version)
  if ([int]$preFunction.version -ne [int]$script:Packet.pre_function_version) {
    throw "admin-api version drifted from $($script:Packet.pre_function_version) to $($preFunction.version)."
  }
  if ("$($preFunction.updated_at)" -ne $script:Packet.pre_function_updated_at) {
    throw 'admin-api update timestamp drifted from the release packet.'
  }
  if ([int]$preMcpSearch.version -ne [int]$script:Packet.pre_mcp_search_version) {
    throw 'mcp-search version drifted before release.'
  }
  if ("$($preMcpSearch.updated_at)" -ne $script:Packet.pre_mcp_search_updated_at) {
    throw 'mcp-search update timestamp drifted before release.'
  }

  $preInventory = Invoke-Inventory `
    -Output 'references/verification/admin-dashboard-v2-rollup-correction-retry-pre-inventory-2026-07-17.json'
  Assert-InventoryRevision -Inventory $preInventory -ExpectedRevision $script:Packet.rollback_revision

  $database = Invoke-NodeEvidenceGate `
    -Script 'scripts/verify-admin-dashboard-v2-database.mjs' `
    -Arguments @(
      '--project-ref', $ProjectRef,
      '--release-fingerprint', $script:ReleaseFingerprint,
      '--output', 'references/verification/admin-dashboard-v2-rollup-correction-retry-database-preflight-2026-07-17.json'
    ) `
    -Output 'references/verification/admin-dashboard-v2-rollup-correction-retry-database-preflight-2026-07-17.json'
  $pendingDays = [int]$database.backlog.pending_day_count

  $null = Invoke-QuietCheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-admin-dashboard-phase-a-railway-live.mjs',
    '--mcp-url', 'https://mcp.supericons.dev/mcp',
    '--expect-version', '0.4.18',
    '--expect-material-assets', '8524',
    '--expect-hosted-search-resilience', 'enabled',
    '--allow-active',
    '--output', 'references/verification/admin-dashboard-v2-rollup-correction-retry-railway-health-2026-07-17.json'
  )
  $railway = Get-Content -LiteralPath $RailwayEvidence -Raw | ConvertFrom-Json
  if ($railway.status -ne 'ok') { throw 'Railway protection health did not pass.' }

  $null = Invoke-QuietCheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-admin-dashboard-phase-a-search-health.mjs',
    '--search-url', $SearchUrl,
    '--output', 'references/verification/admin-dashboard-v2-rollup-correction-retry-search-health-2026-07-17.json',
    '--warmup-count', '1',
    '--measured-count', '2',
    '--latency-limit-ms', '2000',
    '--request-timeout-ms', '5000'
  )
  $searchHealth = Get-Content -LiteralPath $SearchEvidence -Raw | ConvertFrom-Json
  if ($searchHealth.status -ne 'ok') { throw 'Strict production search health did not pass.' }

  $legacyPreflight = Invoke-NodeEvidenceGate `
    -Script 'scripts/verify-admin-dashboard-phase-a-admin-api-live.mjs' `
    -Arguments @(
      '--admin-url', $AdminUrl,
      '--mode', 'preflight',
      '--preflight-max-latency-ms', '10000',
      '--output', 'references/verification/admin-dashboard-v2-rollup-correction-retry-preflight-2026-07-17.json'
    ) `
    -Output 'references/verification/admin-dashboard-v2-rollup-correction-retry-preflight-2026-07-17.json'

  $startedAt = (Get-Date).ToUniversalTime().ToString('o')
  $candidate = Deploy-Revision `
    -Revision $script:Packet.implementation_revision `
    -Kind 'candidate' `
    -ExpectedId "$($preFunction.id)" `
    -PreviousVersion ([int]$preFunction.version)
  $script:CandidateFunction = $candidate

  $candidateInventory = Invoke-Inventory `
    -Output 'references/verification/admin-dashboard-v2-rollup-correction-retry-candidate-inventory-2026-07-17.json'
  Assert-InventoryRevision -Inventory $candidateInventory -ExpectedRevision $script:Packet.implementation_revision

  $v2Live = Invoke-NodeEvidenceGate `
    -Script 'scripts/verify-admin-dashboard-v2-live.mjs' `
    -Arguments @(
      '--admin-url', $AdminUrl,
      '--release-fingerprint', $script:ReleaseFingerprint,
      '--output', 'references/verification/admin-dashboard-v2-rollup-correction-retry-live-2026-07-17.json'
    ) `
    -Output 'references/verification/admin-dashboard-v2-rollup-correction-retry-live-2026-07-17.json'

  $rollupParity = Invoke-NodeEvidenceGate `
    -Script 'scripts/verify-admin-dashboard-v2-rollup-parity.mjs' `
    -Arguments @(
      '--project-ref', $ProjectRef,
      '--admin-url', $AdminUrl,
      '--release-fingerprint', $script:ReleaseFingerprint,
      '--output', 'references/verification/admin-dashboard-v2-rollup-correction-retry-parity-2026-07-17.json'
    ) `
    -Output 'references/verification/admin-dashboard-v2-rollup-correction-retry-parity-2026-07-17.json'

  $phaseALive = Invoke-NodeEvidenceGate `
    -Script 'scripts/verify-admin-dashboard-phase-a-admin-api-live.mjs' `
    -Arguments @(
      '--admin-url', $AdminUrl,
      '--mode', 'candidate',
      '--max-refresh-days', "$pendingDays",
      '--output', 'references/verification/admin-dashboard-v2-rollup-correction-retry-phase-a-regression-2026-07-17.json'
    ) `
    -Output 'references/verification/admin-dashboard-v2-rollup-correction-retry-phase-a-regression-2026-07-17.json'

  $functionsAfter = Get-Functions
  $postFunction = Get-NamedFunction -Functions $functionsAfter -Name $FunctionName
  $postMcpSearch = Get-NamedFunction -Functions $functionsAfter -Name 'mcp-search'
  Assert-FunctionState `
    -Function $postFunction `
    -ExpectedId "$($preFunction.id)" `
    -MinimumVersion ([int]$candidate.version)
  if ([int]$postMcpSearch.version -ne [int]$preMcpSearch.version) {
    throw 'mcp-search version changed during the admin-api release.'
  }
  if ("$($postMcpSearch.updated_at)" -ne "$($preMcpSearch.updated_at)") {
    throw 'mcp-search update timestamp changed during the admin-api release.'
  }

  Write-JsonEvidence -Path $CompletionEvidence -Value ([ordered]@{
    artifact = 'admin_dashboard_v2_rollup_correction_retry_completion'
    release_fingerprint = $script:ReleaseFingerprint
    project_ref = $ProjectRef
    implementation_revision = $script:Packet.implementation_revision
    rollback_revision = $script:Packet.rollback_revision
    pre_function = [ordered]@{
      id = "$($preFunction.id)"
      version = [int]$preFunction.version
      updated_at = "$($preFunction.updated_at)"
      verify_jwt = $false
    }
    candidate_function = [ordered]@{
      id = "$($candidate.id)"
      version = [int]$candidate.version
      updated_at = "$($candidate.updated_at)"
      verify_jwt = $false
      source_sha256 = $candidateInventory.source_download.index_sha256
    }
    unchanged_mcp_search = [ordered]@{
      id = "$($postMcpSearch.id)"
      version = [int]$postMcpSearch.version
      updated_at = "$($postMcpSearch.updated_at)"
    }
    database = $database
    railway_protection = [ordered]@{
      version = $railway.health.version
      state = $railway.health.hosted_search_resilience.state
      consecutive_failures = $railway.health.hosted_search_resilience.consecutive_failures
      synthetic_tool_calls = $railway.synthetic_tool_calls
    }
    search_health = [ordered]@{
      measured_latency_limit_ms = $searchHealth.contract.measured_latency_limit_ms
      measured_latencies_ms = @($searchHealth.measurements | ForEach-Object { $_.latency_ms })
    }
    legacy_preflight = $legacyPreflight.preflight
    v2_live_contract = $v2Live
    rollup_parity = $rollupParity
    phase_a_regression = $phaseALive
    rollback_used = $false
    mutations = [ordered]@{
      admin_api_candidate_deployments = 1
      admin_api_rollback_deployments = 0
      rollup_refresh_days = @($phaseALive.rollup_refreshed_days).Count
      migration = 0
      mcp_search = 0
      railway = 0
      storage = 0
      npm_publication = 0
    }
    status = 'ok'
    started_at = $startedAt
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
  Write-Host "Admin dashboard V2 rollup correction completed at function version $($candidate.version)."
}
catch {
  $failure = $_.Exception.Message
  $candidateToRollback = $script:CandidateFunction
  if (-not $candidateToRollback -and $script:CandidateDeploySubmitted -and $preFunction) {
    try {
      $currentFunctions = Get-Functions
      $currentFunction = Get-NamedFunction -Functions $currentFunctions -Name $FunctionName
      if ([int]$currentFunction.version -gt [int]$preFunction.version) {
        $candidateToRollback = $currentFunction
      }
    }
    catch {
      throw "Candidate release failed and the live function state could not be determined. Original failure: $failure"
    }
  }
  if ($candidateToRollback) {
    Invoke-Rollback -Reason $failure -CandidateFunction $candidateToRollback
    throw "Candidate verification failed and rollback completed. Original failure: $failure"
  }
  throw
}
finally {
  for ($index = $credentialStates.Count - 1; $index -ge 0; $index -= 1) {
    Restore-AdminDashboardReleaseProcessCredential -State $credentialStates[$index]
  }
  $credentialStates = @()
}
