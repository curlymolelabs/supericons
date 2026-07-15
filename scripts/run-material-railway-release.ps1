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
$ExpectedPreDeploymentId = '36e284e7-df61-4c4b-95c6-f17492db5cf7'
$ExpectedPreImageDigest = 'sha256:2e246dabd3caabd1ca13da1de88ab75d682c3b59aa06f32b2411b12b6841f73f'
$McpUrl = 'https://mcp.supericons.dev/mcp'
$ExpectedVersion = '0.4.18'
$ExpectedAssetCount = 8524

$Root = Split-Path -Parent $PSScriptRoot
$FingerprintSource = Join-Path $Root 'references/verification/material-railway-release-fingerprint-2026-07-15.txt'
$PreflightEvidence = Join-Path $Root 'references/verification/material-railway-predeploy-run-2026-07-15.json'
$LiveEvidence = Join-Path $Root 'references/verification/material-railway-live-gate-production-2026-07-15.json'
$CompletionEvidence = Join-Path $Root 'references/verification/material-railway-deploy-completion-2026-07-15.json'
$RollbackEvidence = Join-Path $Root 'references/verification/material-railway-rollback-2026-07-15.json'
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

function Write-JsonEvidence {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][object]$Value
  )

  if (Test-Path -LiteralPath $Path) {
    throw "Evidence path already exists: $Path"
  }
  $json = $Value | ConvertTo-Json -Depth 12
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
  for ($attempt = 0; $attempt -lt 15; $attempt += 1) {
    try {
      $health = Invoke-RestMethod -Uri 'https://mcp.supericons.dev/health' -TimeoutSec 2
      if (
        $health.ok -eq $true -and
        $health.version -eq $ExpectedVersion -and
        $health.material_assets.available -eq $true -and
        [int]$health.material_assets.asset_count -eq $ExpectedAssetCount
      ) {
        return $health
      }
    } catch {
      # A new Railway container may need a short warm-up window.
    }
    Start-Sleep -Seconds 2
  }
  throw 'The candidate did not satisfy the pinned health contract within 60 seconds.'
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

  $legacyOutputRelative = 'tmp/material-railway-release-run/rollback-legacy-gate.json'
  $legacyOutput = Join-Path $Root $legacyOutputRelative
  Invoke-CheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-material-railway-legacy-live.mjs',
    '--mcp-url', $McpUrl,
    '--expect-version', '0.4.17',
    '--output', $legacyOutputRelative
  )
  Write-JsonEvidence -Path $RollbackEvidence -Value ([ordered]@{
    artifact = 'material_railway_rollback'
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
  throw 'Pass -Execute only after the owner has approved the exact packet fingerprint.'
}

Set-Location $Root
if (-not (Test-Path -LiteralPath $FingerprintSource)) {
  throw "Missing fingerprint source: $FingerprintSource"
}

Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-material-railway-release-packet.mjs',
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

foreach ($path in @($PreflightEvidence, $LiveEvidence, $CompletionEvidence, $RollbackEvidence)) {
  if (Test-Path -LiteralPath $path) {
    throw "This packet is write-once and evidence already exists: $path"
  }
}

Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-asset-bundle.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-hydration.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-server-contract.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-mcp-usage-dedupe.mjs')

$service = Get-TargetServiceInstance
$pre = $service.latestDeployment
if ($pre.id -ne $ExpectedPreDeploymentId) {
  throw "Railway deployment drifted. Expected $ExpectedPreDeploymentId, received $($pre.id)."
}
if ($pre.status -ne 'SUCCESS') {
  throw "The current Railway deployment is not healthy: $($pre.status)."
}
if ($pre.meta.imageDigest -ne $ExpectedPreImageDigest) {
  throw 'The current Railway image digest drifted from the approved packet.'
}

Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-material-railway-legacy-live.mjs',
  '--mcp-url', $McpUrl,
  '--expect-version', '0.4.17',
  '--output', 'references/verification/material-railway-predeploy-run-2026-07-15.json'
)

$workspace = Join-Path $Root 'tmp/material-railway-release-run'
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
    -Message 'Release Material hydration in hosted MCP' `
    -Workspace $workspace
  $script:CandidateWentLive = $true

  $health = Wait-ForCandidateHealth
  Invoke-CheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-material-railway-live.mjs',
    '--mcp-url', $McpUrl,
    '--output', 'references/verification/material-railway-live-gate-production-2026-07-15.json'
  )
  $liveGate = Get-Content -LiteralPath $LiveEvidence -Raw | ConvertFrom-Json
  if ($liveGate.status -ne 'ok' -or @($liveGate.checks).Count -ne 17) {
    throw 'The production Material gate did not retain exactly 17 successful checks.'
  }

  Write-JsonEvidence -Path $CompletionEvidence -Value ([ordered]@{
    artifact = 'material_railway_deploy_completion'
    approval_fingerprint = $ApprovalFingerprint
    implementation_revision = $ImplementationRevision
    predeployment_id = $ExpectedPreDeploymentId
    candidate_deployment_id = $candidate.id
    candidate_image_digest = $candidate.meta.imageDigest
    health = $health
    live_gate_path = 'references/verification/material-railway-live-gate-production-2026-07-15.json'
    live_gate_checks = @($liveGate.checks).Count
    rollback_used = $false
    started_at = $startedAt
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
  Write-Host "Railway Material release completed: $($candidate.id)"
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
