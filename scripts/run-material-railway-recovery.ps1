param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$ApprovalFingerprint,

  [switch]$Execute
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectId = 'b53f5f48-607f-49ae-a71e-37cc766f6973'
$EnvironmentId = '6345c75b-5ac2-40d6-b176-a4a783ce3eb3'
$ServiceId = '352420e5-6a02-43a4-99f2-f6dbde522acb'
$ImplementationRevision = '13f28d7e72484538b0a2be14f680ef8a4c4e3c52'
$ImplementationTree = '27668ce5ff4027aabe28432f1ce2eaf6386bb109'
$RollbackRevision = '02b2c22ea8a76decee92d83c853ca6cf33899e6c'
$RollbackTree = 'b5cea763f36be4e32453d4e1aca49988a4d3a72f'
$ExpectedPreDeploymentId = '01453e0d-20e5-496c-a9da-40b135e173c4'
$ExpectedPreImageDigest = 'sha256:043f4d748963bcd3e6198880472066a02690351569c601db0ef289b52cef9392'
$McpUrl = 'https://mcp.supericons.dev/mcp'
$SearchUrl = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/mcp-search'
$ExpectedVersion = '0.4.18'
$ExpectedAssetCount = 8524
$StabilityProbeCount = 6
$StabilityProbeIntervalMilliseconds = 36000
$HealthyProbeLatencyLimitMilliseconds = 5000
$EngineGateLatencyLimitMilliseconds = 3000
$AttributionOverheadBudgetMilliseconds = 1000
$MaxPreflightAttempts = 3
$MaxPreflightRetryWindowSeconds = 900
$PreflightRetryDelaySeconds = 90
$McpRequestTimeoutMilliseconds = 120000
$MaxEngineAttempts = 3
$MaxEngineRetryWindowSeconds = 600
$EngineRetryDelaySeconds = 90

$Root = Split-Path -Parent $PSScriptRoot
$FingerprintSource = Join-Path $Root 'references/verification/material-railway-recovery-fingerprint-2026-07-15.txt'
$LegacyPreflightEvidence = Join-Path $Root 'references/verification/material-railway-recovery-attribution-legacy-preflight-2026-07-15.json'
$MaterialEvidence = Join-Path $Root 'references/verification/material-railway-recovery-attribution-material-gate-2026-07-15.json'
$CompletionEvidence = Join-Path $Root 'references/verification/material-railway-recovery-attribution-completion-2026-07-15.json'
$RollbackEvidence = Join-Path $Root 'references/verification/material-railway-recovery-attribution-rollback-2026-07-15.json'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE"
  }
}

function Invoke-JsonCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $lines = @(& $FilePath @Arguments 2>&1)
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE. $($lines -join ' ')"
  }
  return ($lines -join "`n") | ConvertFrom-Json
}

function Invoke-EvidenceCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  & $FilePath @Arguments | Out-Host
  $exitCode = $LASTEXITCODE
  return $exitCode
}

function Get-OptionalProperty {
  param(
    [Parameter(Mandatory = $true)][object]$Value,
    [Parameter(Mandatory = $true)][string]$Name
  )

  $property = $Value.PSObject.Properties[$Name]
  if ($property) {
    return $property.Value
  }
  return $null
}

function Write-JsonEvidence {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][object]$Value
  )

  if (Test-Path -LiteralPath $Path) {
    throw "Evidence path already exists: $Path"
  }
  $json = $Value | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($Path, "$json`n", $Utf8NoBom)
}

function Get-TargetServiceInstance {
  $status = Invoke-JsonCommand -FilePath 'railway' -Arguments @('status', '--json')
  if ($status.id -ne $ProjectId) {
    throw "Railway project drifted. Expected $ProjectId, received $($status.id)."
  }

  $environment = @($status.environments.edges | ForEach-Object { $_.node }) |
    Where-Object { $_.id -eq $EnvironmentId }
  if (@($environment).Count -ne 1) {
    throw "Expected exactly one Railway environment with id $EnvironmentId."
  }

  $instance = @($environment.serviceInstances.edges | ForEach-Object { $_.node }) |
    Where-Object { $_.serviceId -eq $ServiceId }
  if (@($instance).Count -ne 1) {
    throw "Expected exactly one Railway service with id $ServiceId."
  }
  return $instance
}

function Get-Deployments {
  return @(Invoke-JsonCommand -FilePath 'railway' -Arguments @(
    'deployment', 'list', '--limit', '10', '--json',
    '--service', $ServiceId, '--environment', $EnvironmentId
  ))
}

function Wait-ForNewDeployment {
  param(
    [Parameter(Mandatory = $true)][string]$PreviousDeploymentId,
    [Parameter(Mandatory = $true)][string]$Kind
  )

  $deploymentId = $null
  for ($attempt = 0; $attempt -lt 180; $attempt += 1) {
    $deployments = Get-Deployments
    if (-not $deploymentId) {
      $candidate = $deployments | Select-Object -First 1
      if ($candidate -and $candidate.id -ne $PreviousDeploymentId) {
        $deploymentId = $candidate.id
        if ($Kind -eq 'candidate') {
          $script:CandidateDeploymentId = $deploymentId
        }
      }
    }

    if ($deploymentId) {
      $deployment = $deployments | Where-Object { $_.id -eq $deploymentId } | Select-Object -First 1
      if ($deployment.status -eq 'SUCCESS') {
        return $deployment
      }
      if ($deployment.status -in @('FAILED', 'CRASHED', 'REMOVED')) {
        throw "$Kind Railway deployment $deploymentId ended with status $($deployment.status)."
      }
    }
    Start-Sleep -Seconds 5
  }
  throw "Timed out waiting for the $Kind Railway deployment."
}

function Expand-GitRevision {
  param(
    [Parameter(Mandatory = $true)][string]$Revision,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  New-Item -ItemType Directory -Path $Destination | Out-Null
  $archivePath = "$Destination.tar"
  Invoke-CheckedCommand -FilePath 'git' -Arguments @('archive', '--format=tar', '--output', $archivePath, $Revision)
  Invoke-CheckedCommand -FilePath 'tar' -Arguments @('-xf', $archivePath, '-C', $Destination)
  Remove-Item -LiteralPath $archivePath
}

function Start-RevisionDeployment {
  param(
    [Parameter(Mandatory = $true)][string]$Revision,
    [Parameter(Mandatory = $true)][string]$PreviousDeploymentId,
    [Parameter(Mandatory = $true)][string]$Kind,
    [Parameter(Mandatory = $true)][string]$Message,
    [Parameter(Mandatory = $true)][string]$Workspace
  )

  $sourcePath = Join-Path $Workspace $Kind
  Expand-GitRevision -Revision $Revision -Destination $sourcePath
  $uploadLog = Join-Path $Workspace "$Kind-upload.log"
  $output = @(& railway up $sourcePath --path-as-root --detach --project $ProjectId --environment $EnvironmentId --service $ServiceId --message $Message 2>&1)
  [System.IO.File]::WriteAllText($uploadLog, "$($output -join "`n")`n", $Utf8NoBom)
  if ($LASTEXITCODE -ne 0) {
    throw "Railway upload for $Kind failed with exit code $LASTEXITCODE. See $uploadLog."
  }
  return Wait-ForNewDeployment -PreviousDeploymentId $PreviousDeploymentId -Kind $Kind
}

function Wait-ForCandidateHealth {
  $deadline = (Get-Date).ToUniversalTime().AddSeconds(120)
  while ((Get-Date).ToUniversalTime() -lt $deadline) {
    try {
      $health = Invoke-RestMethod -Uri 'https://mcp.supericons.dev/health' -TimeoutSec 10
      if (
        $health.ok -eq $true -and
        $health.version -eq $ExpectedVersion -and
        $health.material_assets.available -eq $true -and
        [int]$health.material_assets.asset_count -eq $ExpectedAssetCount
      ) {
        return $health
      }
    } catch {
      # A new Railway container may need a bounded warm-up window.
    }
    Start-Sleep -Seconds 4
  }
  throw 'The candidate did not satisfy the pinned health contract within 120 seconds.'
}

function Invoke-RecoveryLiveGate {
  param(
    [Parameter(Mandatory = $true)][string]$Profile,
    [Parameter(Mandatory = $true)][string]$OutputRelative
  )

  return Invoke-EvidenceCommand -FilePath 'node' -Arguments @(
    'scripts/verify-material-railway-recovery-live.mjs',
    '--profile', $Profile,
    '--mcp-url', $McpUrl,
    '--request-timeout-ms', "$McpRequestTimeoutMilliseconds",
    '--engine-latency-limit-ms', "$EngineGateLatencyLimitMilliseconds",
    '--output', $OutputRelative
  )
}

function Invoke-SearchEngineProbe {
  param(
    [Parameter(Mandatory = $true)][int]$Count,
    [Parameter(Mandatory = $true)][int]$IntervalMilliseconds,
    [Parameter(Mandatory = $true)][string]$OutputRelative,
    [Parameter(Mandatory = $true)][int]$RequestTimeoutMilliseconds
  )

  return Invoke-EvidenceCommand -FilePath 'node' -Arguments @(
    'scripts/probe-material-search-engine.mjs',
    '--search-url', $SearchUrl,
    '--output', $OutputRelative,
    '--count', "$Count",
    '--interval-ms', "$IntervalMilliseconds",
    '--latency-limit-ms', "$HealthyProbeLatencyLimitMilliseconds",
    '--request-timeout-ms', "$RequestTimeoutMilliseconds",
    '--client-family', 'material_railway_recovery'
  )
}

function Invoke-EngineAttribution {
  param(
    [Parameter(Mandatory = $true)][string]$GateEvidenceRelative,
    [Parameter(Mandatory = $true)][string]$OutputRelative
  )

  return Invoke-EvidenceCommand -FilePath 'node' -Arguments @(
    'scripts/probe-material-engine-attribution.mjs',
    '--search-url', $SearchUrl,
    '--gate-evidence', $GateEvidenceRelative,
    '--output', $OutputRelative,
    '--overhead-budget-ms', "$AttributionOverheadBudgetMilliseconds",
    '--request-timeout-ms', "$McpRequestTimeoutMilliseconds",
    '--client-family', 'material_railway_recovery_attribution'
  )
}

function Invoke-Rollback {
  param(
    [Parameter(Mandatory = $true)][string]$FailedDeploymentId,
    [Parameter(Mandatory = $true)][string]$Reason,
    [Parameter(Mandatory = $true)][string]$Workspace
  )

  $rollbackStartedAt = (Get-Date).ToUniversalTime().ToString('o')
  $rollback = Start-RevisionDeployment `
    -Revision $RollbackRevision `
    -PreviousDeploymentId $FailedDeploymentId `
    -Kind 'rollback' `
    -Message 'Restore verified pre-Material Railway MCP source' `
    -Workspace $Workspace

  $legacyOutputRelative = 'tmp/material-railway-recovery-attribution-run/rollback-legacy-gate.json'
  $legacyOutput = Join-Path $Root $legacyOutputRelative
  Invoke-CheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-material-railway-legacy-live.mjs',
    '--mcp-url', $McpUrl,
    '--expect-version', '0.4.17',
    '--output', $legacyOutputRelative
  )
  Write-JsonEvidence -Path $RollbackEvidence -Value ([ordered]@{
    artifact = 'material_railway_recovery_rollback'
    approval_fingerprint = $ApprovalFingerprint
    reason = $Reason
    failed_deployment_id = $FailedDeploymentId
    rollback_revision = $RollbackRevision
    rollback_deployment_id = $rollback.id
    rollback_image_digest = $rollback.meta.imageDigest
    started_at = $rollbackStartedAt
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
    legacy_gate = Get-Content -LiteralPath $legacyOutput -Raw | ConvertFrom-Json
  })
}

if (-not $Execute) {
  throw 'Pass -Execute only after the owner has approved the exact recovery packet fingerprint.'
}

Set-Location $Root
if (-not (Test-Path -LiteralPath $FingerprintSource)) {
  throw "Missing fingerprint source: $FingerprintSource"
}

Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-material-railway-recovery-packet.mjs',
  '--fingerprint', $ApprovalFingerprint
)

if ((git rev-parse $ImplementationRevision) -ne $ImplementationRevision) {
  throw 'The implementation revision is unavailable.'
}
if ((git rev-parse "$ImplementationRevision`^{tree}") -ne $ImplementationTree) {
  throw 'The implementation tree does not match the packet.'
}
if ((git rev-parse "$RollbackRevision`^{tree}") -ne $RollbackTree) {
  throw 'The rollback tree does not match the packet.'
}

$evidencePaths = @(
  $LegacyPreflightEvidence,
  $MaterialEvidence,
  $CompletionEvidence,
  $RollbackEvidence
)
for ($attempt = 1; $attempt -le $MaxPreflightAttempts; $attempt += 1) {
  $evidencePaths += Join-Path $Root "references/verification/material-railway-recovery-attribution-stability-preflight-attempt-$attempt-2026-07-15.json"
}
for ($attempt = 1; $attempt -le $MaxEngineAttempts; $attempt += 1) {
  $evidencePaths += Join-Path $Root "references/verification/material-railway-recovery-attribution-engine-attempt-$attempt-2026-07-15.json"
  $evidencePaths += Join-Path $Root "references/verification/material-railway-recovery-attribution-attempt-$attempt-2026-07-15.json"
}
foreach ($path in $evidencePaths) {
  if (Test-Path -LiteralPath $path) {
    throw "This packet is write-once and evidence already exists: $path"
  }
}

Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-asset-bundle.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-hydration.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-server-contract.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-mcp-usage-dedupe.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-search-engine-probe.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-engine-attribution.mjs')

$service = Get-TargetServiceInstance
$pre = $service.latestDeployment
if ($pre.id -ne $ExpectedPreDeploymentId) {
  throw "Railway deployment drifted. Expected $ExpectedPreDeploymentId, received $($pre.id)."
}
if ($pre.status -ne 'SUCCESS') {
  throw "The current Railway deployment is not healthy: $($pre.status)."
}
if ($pre.meta.imageDigest -ne $ExpectedPreImageDigest) {
  throw 'The current Railway image digest drifted from the approved recovery packet.'
}

Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-material-railway-legacy-live.mjs',
  '--mcp-url', $McpUrl,
  '--expect-version', '0.4.17',
  '--output', 'references/verification/material-railway-recovery-attribution-legacy-preflight-2026-07-15.json'
)

$preflightAttempts = @()
$preflightPassed = $false
$preflightDeadline = (Get-Date).ToUniversalTime().AddSeconds($MaxPreflightRetryWindowSeconds)
for ($attempt = 1; $attempt -le $MaxPreflightAttempts; $attempt += 1) {
  $stabilityRelative = "references/verification/material-railway-recovery-attribution-stability-preflight-attempt-$attempt-2026-07-15.json"
  $stabilityPath = Join-Path $Root $stabilityRelative
  $stabilityExitCode = Invoke-SearchEngineProbe `
    -Count $StabilityProbeCount `
    -IntervalMilliseconds $StabilityProbeIntervalMilliseconds `
    -OutputRelative $stabilityRelative `
    -RequestTimeoutMilliseconds 10000
  $stability = Get-Content -LiteralPath $stabilityPath -Raw | ConvertFrom-Json
  $stabilityHealthy = (
    $stabilityExitCode -eq 0 -and
    $stability.status -eq 'ok' -and
    @($stability.probes).Count -eq $StabilityProbeCount
  )
  $preflightAttempts += [ordered]@{
    attempt = $attempt
    evidence_path = $stabilityRelative
    status = $stability.status
    probes_completed = @($stability.probes).Count
    error = Get-OptionalProperty -Value $stability -Name 'error'
  }
  if ($stabilityHealthy) {
    $preflightPassed = $true
    break
  }
  if ($attempt -ge $MaxPreflightAttempts) {
    throw 'The direct search engine did not pass any of the three stability windows. No upload was attempted.'
  }
  if ((Get-Date).ToUniversalTime().AddSeconds($PreflightRetryDelaySeconds) -gt $preflightDeadline) {
    throw 'The 15-minute preflight retry window expired. No upload was attempted.'
  }
  Start-Sleep -Seconds $PreflightRetryDelaySeconds
}
if (-not $preflightPassed) {
  throw 'The direct search engine stability preflight did not pass. No upload was attempted.'
}

$workspace = Join-Path $Root 'tmp/material-railway-recovery-attribution-run'
if (Test-Path -LiteralPath $workspace) {
  Remove-Item -LiteralPath $workspace -Recurse -Force
}
New-Item -ItemType Directory -Path $workspace | Out-Null

$script:CandidateDeploymentId = $null
$script:CandidateWentLive = $false
$startedAt = (Get-Date).ToUniversalTime().ToString('o')
try {
  $candidate = Start-RevisionDeployment `
    -Revision $ImplementationRevision `
    -PreviousDeploymentId $ExpectedPreDeploymentId `
    -Kind 'candidate' `
    -Message 'Recover Material hydration in hosted MCP' `
    -Workspace $workspace
  $script:CandidateWentLive = $true

  $health = Wait-ForCandidateHealth
  $materialExitCode = Invoke-RecoveryLiveGate `
    -Profile 'material-local' `
    -OutputRelative 'references/verification/material-railway-recovery-attribution-material-gate-2026-07-15.json'
  $materialGate = Get-Content -LiteralPath $MaterialEvidence -Raw | ConvertFrom-Json
  if ($materialExitCode -ne 0 -or $materialGate.status -ne 'ok' -or @($materialGate.checks).Count -ne 11) {
    throw 'candidate_material_local_gate_failed'
  }

  $engineAttempts = @()
  $engineGatePassed = $false
  $retryDeadline = (Get-Date).ToUniversalTime().AddSeconds($MaxEngineRetryWindowSeconds)
  for ($attempt = 1; $attempt -le $MaxEngineAttempts; $attempt += 1) {
    $engineRelative = "references/verification/material-railway-recovery-attribution-engine-attempt-$attempt-2026-07-15.json"
    $enginePath = Join-Path $Root $engineRelative
    $engineExitCode = Invoke-RecoveryLiveGate -Profile 'engine-dependent' -OutputRelative $engineRelative
    $engineGate = Get-Content -LiteralPath $enginePath -Raw | ConvertFrom-Json
    if ($engineExitCode -eq 0 -and $engineGate.status -eq 'ok' -and @($engineGate.checks).Count -eq 6) {
      $engineAttempts += [ordered]@{
        attempt = $attempt
        gate_path = $engineRelative
        gate_status = 'ok'
        attribution_path = $null
        attribution_status = $null
      }
      $engineGatePassed = $true
      break
    }

    if ($engineGate.status -eq 'failed') {
      $engineAttempts += [ordered]@{
        attempt = $attempt
        gate_path = $engineRelative
        gate_status = $engineGate.status
        gate_error = Get-OptionalProperty -Value $engineGate -Name 'error'
        attribution_path = $null
        attribution_status = $null
      }
      throw "candidate_engine_correctness_or_local_latency_failure_attempt_$attempt"
    }
    if (
      $engineExitCode -ne 1 -or
      $engineGate.status -ne 'latency_failed' -or
      @($engineGate.checks).Count -ne 6 -or
      @($engineGate.latency_failures).Count -lt 1
    ) {
      throw "candidate_engine_gate_invalid_evidence_attempt_$attempt"
    }

    $attributionRelative = "references/verification/material-railway-recovery-attribution-attempt-$attempt-2026-07-15.json"
    $attributionPath = Join-Path $Root $attributionRelative
    $attributionExitCode = Invoke-EngineAttribution `
      -GateEvidenceRelative $engineRelative `
      -OutputRelative $attributionRelative
    $attribution = Get-Content -LiteralPath $attributionPath -Raw | ConvertFrom-Json
    $engineAttempts += [ordered]@{
      attempt = $attempt
      gate_path = $engineRelative
      gate_status = $engineGate.status
      latency_failures = @($engineGate.latency_failures).Count
      attribution_path = $attributionRelative
      attribution_status = $attribution.status
      attribution_error = Get-OptionalProperty -Value $attribution -Name 'error'
    }

    if (
      $attributionExitCode -eq 0 -and
      $attribution.status -eq 'engine_attributed' -and
      @($attribution.comparisons).Count -eq @($engineGate.latency_failures).Count
    ) {
      $engineGatePassed = $true
      break
    }
    if ($attributionExitCode -eq 2 -and $attribution.status -eq 'candidate_overhead') {
      throw "candidate_engine_overhead_exceeded_attempt_$attempt"
    }
    if ($attributionExitCode -ne 1 -or $attribution.status -ne 'dependency_degraded') {
      throw "candidate_engine_attribution_invalid_evidence_attempt_$attempt"
    }
    if ($attempt -ge $MaxEngineAttempts) {
      throw 'dependency_unresolved_after_retry_budget'
    }
    if ((Get-Date).ToUniversalTime().AddSeconds($EngineRetryDelaySeconds) -gt $retryDeadline) {
      throw 'dependency_unresolved_after_retry_window'
    }
    Start-Sleep -Seconds $EngineRetryDelaySeconds
  }

  if (-not $engineGatePassed) {
    throw 'dependency_unresolved_after_retry_budget'
  }

  Write-JsonEvidence -Path $CompletionEvidence -Value ([ordered]@{
    artifact = 'material_railway_recovery_completion'
    approval_fingerprint = $ApprovalFingerprint
    implementation_revision = $ImplementationRevision
    predeployment_id = $ExpectedPreDeploymentId
    candidate_deployment_id = $candidate.id
    candidate_image_digest = $candidate.meta.imageDigest
    health = $health
    stability_preflight_attempts = $preflightAttempts
    material_gate_path = 'references/verification/material-railway-recovery-attribution-material-gate-2026-07-15.json'
    material_gate_checks = @($materialGate.checks).Count
    engine_attempts = $engineAttempts
    engine_gate_checks = 6
    total_gate_checks = 17
    rollback_used = $false
    started_at = $startedAt
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
  Write-Host "Railway Material recovery completed: $($candidate.id)"
} catch {
  $failure = $_.Exception.Message
  if ($script:CandidateWentLive -and $script:CandidateDeploymentId) {
    try {
      Invoke-Rollback -FailedDeploymentId $script:CandidateDeploymentId -Reason $failure -Workspace $workspace
    } catch {
      throw "Candidate verification failed. Rollback also failed or could not be verified. $($_.Exception.Message) Original failure: $failure"
    }
    throw "Candidate verification failed and rollback completed. Original failure: $failure"
  }
  throw
}
