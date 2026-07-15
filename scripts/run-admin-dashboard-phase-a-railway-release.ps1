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
$ImplementationRevision = '3ce3224205c4ef13f7eb3ad0d83556db4c08c708'
$ImplementationTree = '12070a25c24225b11cd19b0987cf500a23de1218'
$RollbackRevision = '31ac66dfecc40e4549f08fc3d9dea99d583a3393'
$RollbackTree = '0064918488fe4c37382d2b21da43c1a5ba0f372c'
$ExpectedPreDeploymentId = '5ea2e0b8-201a-4be9-81b7-a450d7f85c61'
$ExpectedPreImageDigest = 'sha256:91288b2a0323f9af9341e8846768057968ff8bfb5af567bf644590c77a9a3b58'
$McpUrl = 'https://mcp.supericons.dev/mcp'
$ExpectedVersion = '0.4.18'
$ExpectedAssetCount = 8524

$Root = Split-Path -Parent $PSScriptRoot
$FingerprintSource = Join-Path $Root 'references/verification/admin-dashboard-phase-a-railway-fingerprint-2026-07-16.txt'
$PreflightEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-railway-preflight-2026-07-16.json'
$LiveEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-railway-live-2026-07-16.json'
$CompletionEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-railway-completion-2026-07-16.json'
$RollbackEvidence = Join-Path $Root 'references/verification/admin-dashboard-phase-a-railway-rollback-2026-07-16.json'
$Workspace = Join-Path $Root 'tmp/admin-dashboard-phase-a-railway-release'
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
  [System.IO.File]::WriteAllText(
    $Path,
    "$(ConvertTo-Json $Value -Depth 12)`n",
    $Utf8NoBom
  )
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
      $deployment = $deployments |
        Where-Object { $_.id -eq $deploymentId } |
        Select-Object -First 1
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
  Invoke-CheckedCommand -FilePath 'git' -Arguments @(
    'archive', '--format=tar', '--output', $archivePath, $Revision
  )
  Invoke-CheckedCommand -FilePath 'tar' -Arguments @('-xf', $archivePath, '-C', $Destination)
  Remove-Item -LiteralPath $archivePath
}

function Start-RevisionDeployment {
  param(
    [Parameter(Mandatory = $true)][string]$Revision,
    [Parameter(Mandatory = $true)][string]$PreviousDeploymentId,
    [Parameter(Mandatory = $true)][string]$Kind,
    [Parameter(Mandatory = $true)][string]$Message
  )

  $sourcePath = Join-Path $Workspace $Kind
  Expand-GitRevision -Revision $Revision -Destination $sourcePath
  $uploadLog = Join-Path $Workspace "$Kind-upload.log"
  $output = @(& railway up $sourcePath --path-as-root --detach `
    --project $ProjectId --environment $EnvironmentId --service $ServiceId `
    --message $Message 2>&1)
  [System.IO.File]::WriteAllText($uploadLog, "$($output -join "`n")`n", $Utf8NoBom)
  if ($LASTEXITCODE -ne 0) {
    throw "Railway upload for $Kind failed with exit code $LASTEXITCODE. See $uploadLog."
  }
  return Wait-ForNewDeployment -PreviousDeploymentId $PreviousDeploymentId -Kind $Kind
}

function Invoke-LiveHandshake {
  param(
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  Invoke-CheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-admin-dashboard-phase-a-railway-live.mjs',
    '--mcp-url', $McpUrl,
    '--expect-version', $ExpectedVersion,
    '--expect-material-assets', "$ExpectedAssetCount",
    '--output', $OutputPath
  )
  $evidence = Get-Content -LiteralPath (Join-Path $Root $OutputPath) -Raw | ConvertFrom-Json
  if ($evidence.status -ne 'ok' -or $evidence.synthetic_tool_calls -ne 0) {
    throw 'The Railway live handshake did not satisfy the no-synthetic-telemetry contract.'
  }
  return $evidence
}

function Invoke-Rollback {
  param(
    [Parameter(Mandatory = $true)][string]$FailedDeploymentId,
    [Parameter(Mandatory = $true)][string]$Reason
  )

  $rollbackStartedAt = (Get-Date).ToUniversalTime().ToString('o')
  $rollback = Start-RevisionDeployment `
    -Revision $RollbackRevision `
    -PreviousDeploymentId $FailedDeploymentId `
    -Kind 'rollback' `
    -Message 'Restore pre-Phase-A hosted MCP source'

  $rollbackLivePath = 'tmp/admin-dashboard-phase-a-railway-release/rollback-live.json'
  $rollbackLive = Invoke-LiveHandshake -OutputPath $rollbackLivePath
  Write-JsonEvidence -Path $RollbackEvidence -Value ([ordered]@{
    artifact = 'admin_dashboard_phase_a_railway_rollback'
    approval_fingerprint = $ApprovalFingerprint
    reason = $Reason
    failed_deployment_id = $FailedDeploymentId
    rollback_revision = $RollbackRevision
    rollback_deployment_id = $rollback.id
    rollback_image_digest = $rollback.meta.imageDigest
    live_contract = $rollbackLive
    started_at = $rollbackStartedAt
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
}

if (-not $Execute) {
  throw 'Pass -Execute only after the owner has approved the exact packet fingerprint.'
}

Set-Location $Root
Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-admin-dashboard-phase-a-railway-packet.mjs',
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

$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
$resolvedWorkspace = [System.IO.Path]::GetFullPath($Workspace)
if (-not $resolvedWorkspace.StartsWith("$resolvedRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'The Railway release workspace is outside the repository root.'
}
if (Test-Path -LiteralPath $Workspace) {
  Remove-Item -LiteralPath $Workspace -Recurse -Force
}
New-Item -ItemType Directory -Path $Workspace | Out-Null

Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-mcp-phase-a-telemetry.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-server-contract.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-mcp-usage-dedupe.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-hydration.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-material-railway-asset-bundle.mjs')

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

$preflight = Invoke-LiveHandshake `
  -OutputPath 'references/verification/admin-dashboard-phase-a-railway-preflight-2026-07-16.json'

$script:CandidateDeploymentId = $null
$script:CandidateWentLive = $false
$startedAt = (Get-Date).ToUniversalTime().ToString('o')
try {
  $candidate = Start-RevisionDeployment `
    -Revision $ImplementationRevision `
    -PreviousDeploymentId $ExpectedPreDeploymentId `
    -Kind 'candidate' `
    -Message 'Release Admin dashboard Phase A telemetry'
  $script:CandidateWentLive = $true

  $live = Invoke-LiveHandshake `
    -OutputPath 'references/verification/admin-dashboard-phase-a-railway-live-2026-07-16.json'

  Write-JsonEvidence -Path $CompletionEvidence -Value ([ordered]@{
    artifact = 'admin_dashboard_phase_a_railway_completion'
    approval_fingerprint = $ApprovalFingerprint
    implementation_revision = $ImplementationRevision
    predeployment_id = $ExpectedPreDeploymentId
    candidate_deployment_id = $candidate.id
    candidate_image_digest = $candidate.meta.imageDigest
    preflight = $preflight
    live_contract = $live
    rollback_used = $false
    country_coverage_gate = 'Measure after 24 hours of eligible real traffic.'
    started_at = $startedAt
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
  Write-Host "Railway Phase A release completed: $($candidate.id)"
} catch {
  $failure = $_.Exception.Message
  if ($script:CandidateWentLive -and $script:CandidateDeploymentId) {
    try {
      Invoke-Rollback -FailedDeploymentId $script:CandidateDeploymentId -Reason $failure
    } catch {
      throw "Candidate verification failed. Rollback also failed or could not be verified. $($_.Exception.Message) Original failure: $failure"
    }
    throw "Candidate verification failed and rollback completed. Original failure: $failure"
  }
  throw
}
