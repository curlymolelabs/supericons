param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-f]{64}$')]
  [string]$ExpectedManifest,

  [switch]$ExecuteApprovedGroupedRelease
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRef = 'kcjmkakdhsqplvasgkjv'
$FunctionName = 'mcp-search-grouped'
$StableFunctionName = 'mcp-search'
$GroupedUrl = "https://$ProjectRef.supabase.co/functions/v1/$FunctionName"
$StableUrl = "https://$ProjectRef.supabase.co/functions/v1/$StableFunctionName"
$Root = Split-Path -Parent $PSScriptRoot
$ManifestPath = Join-Path $Root 'docs/si-v2/search/reviews/search-v2-beta3-shared-grouped-release-manifest-2026-07-21.json'
$Workspace = Join-Path $Root '.tmp/search-v2-beta3-shared-grouped-release-20260721'
$LiveEvidence = Join-Path $Root 'references/verification/search-v2-beta3-shared-grouped-live-2026-07-21.json'
$LatencyEvidence = Join-Path $Root 'references/verification/search-v2-beta3-shared-fr47-live-2026-07-21.json'
$CompletionEvidence = Join-Path $Root 'references/verification/search-v2-beta3-shared-grouped-release-completion-2026-07-21.json'
$RollbackEvidence = Join-Path $Root 'references/verification/search-v2-beta3-shared-grouped-release-rollback-2026-07-21.json'
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
  try {
    return ($jsonLines -join "`n") | ConvertFrom-Json
  }
  catch {
    throw "$FilePath returned invalid JSON. $($_.Exception.Message)"
  }
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

function Get-FunctionName {
  param([Parameter(Mandatory = $true)][object]$Function)
  if ($Function.PSObject.Properties.Name -contains 'name') { return "$($Function.name)" }
  if ($Function.PSObject.Properties.Name -contains 'slug') { return "$($Function.slug)" }
  return ''
}

function Get-Functions {
  $parsed = Invoke-JsonCommand -FilePath 'npx' -Arguments @(
    'supabase', 'functions', 'list',
    '--project-ref', $ProjectRef,
    '--output', 'json'
  )
  return @($parsed | ForEach-Object { $_ })
}

function Get-MatchingFunction {
  param(
    [Parameter(Mandatory = $true)][object[]]$Functions,
    [Parameter(Mandatory = $true)][string]$Name
  )
  return @($Functions | Where-Object { (Get-FunctionName $_) -eq $Name })
}

function Assert-ActiveFunction {
  param(
    [Parameter(Mandatory = $true)][object]$Function,
    [Parameter(Mandatory = $true)][string]$Name
  )
  if ((Get-FunctionName $Function) -ne $Name) {
    throw "Expected function $Name."
  }
  if ("$($Function.status)".ToUpperInvariant() -notin @('ACTIVE', 'READY')) {
    throw "$Name is not active: $($Function.status)."
  }
  if ("$($Function.verify_jwt)".ToLowerInvariant() -ne 'false') {
    throw "$Name must remain keyless with verify_jwt false."
  }
}

function Assert-StableFunctionPin {
  param([Parameter(Mandatory = $true)][object[]]$Functions)
  $matches = @(Get-MatchingFunction -Functions $Functions -Name $StableFunctionName)
  if ($matches.Count -ne 1) {
    throw "Expected exactly one $StableFunctionName function, found $($matches.Count)."
  }
  $function = $matches[0]
  Assert-ActiveFunction -Function $function -Name $StableFunctionName
  if ("$($function.id)" -ne "$($script:Manifest.stable_function.id)") {
    throw "Stable function id drifted."
  }
  if ([int]$function.version -ne [int]$script:Manifest.stable_function.version) {
    throw "Stable function version drifted."
  }
  if ([long]$function.updated_at -ne [long]$script:Manifest.stable_function.updated_at) {
    throw "Stable function update time drifted."
  }
  return $function
}

function Wait-ForGroupedFunction {
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    $functions = Get-Functions
    $matches = @(Get-MatchingFunction -Functions $functions -Name $FunctionName)
    if ($matches.Count -eq 1) {
      $function = $matches[0]
      if ("$($function.status)".ToUpperInvariant() -in @('ACTIVE', 'READY')) {
        Assert-ActiveFunction -Function $function -Name $FunctionName
        Assert-StableFunctionPin -Functions $functions | Out-Null
        return $function
      }
    }
    Start-Sleep -Seconds 2
  }
  throw "Timed out waiting for $FunctionName to become active."
}

function Wait-ForGroupedFunctionAbsence {
  for ($attempt = 0; $attempt -lt 60; $attempt += 1) {
    $functions = Get-Functions
    $matches = @(Get-MatchingFunction -Functions $functions -Name $FunctionName)
    Assert-StableFunctionPin -Functions $functions | Out-Null
    if ($matches.Count -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  throw "Timed out waiting for $FunctionName to be removed."
}

function Expand-GitRevision {
  param(
    [Parameter(Mandatory = $true)][string]$Revision,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$RepositoryRoot
  )

  New-Item -ItemType Directory -Path $Destination | Out-Null
  $destinationParent = Split-Path -Parent $Destination
  $destinationLeaf = Split-Path -Leaf $Destination
  $archiveFileName = "$destinationLeaf.tar"
  $archivePath = Join-Path $destinationParent $archiveFileName

  try {
    Invoke-CheckedCommand -FilePath 'git' -Arguments @(
      '-C', $RepositoryRoot,
      'archive', '--format=tar', '--output', $archivePath, $Revision
    )
    Push-Location $Destination
    try {
      Invoke-CheckedCommand -FilePath 'tar' -Arguments @(
        '-xf', "../$archiveFileName"
      )
    }
    finally {
      Pop-Location
    }
  }
  finally {
    if (Test-Path -LiteralPath $archivePath) {
      Remove-Item -LiteralPath $archivePath
    }
  }
}

function Remove-GroupedFunctionForRollback {
  param(
    [Parameter(Mandatory = $true)][string]$Reason,
    [AllowNull()][string]$ExpectedFunctionId
  )

  $functions = Get-Functions
  $matches = @(Get-MatchingFunction -Functions $functions -Name $FunctionName)
  if ($matches.Count -gt 1) {
    throw "Rollback found more than one $FunctionName function."
  }
  $rollbackStatus = 'already_absent'
  $observedFunctionId = $null
  if ($matches.Count -eq 1) {
    $observedFunctionId = "$($matches[0].id)"
    if ([string]::IsNullOrWhiteSpace($ExpectedFunctionId)) {
      return [ordered]@{
        status = 'blocked_unverified_function'
        function_name = $FunctionName
        expected_function_id = $null
        observed_function_id = $observedFunctionId
      }
    }
    if ($observedFunctionId -ne $ExpectedFunctionId) {
      return [ordered]@{
        status = 'blocked_mismatched_function'
        function_name = $FunctionName
        expected_function_id = $ExpectedFunctionId
        observed_function_id = $observedFunctionId
      }
    }
    $deleteLines = @(& npx supabase functions delete $FunctionName `
      --project-ref $ProjectRef --yes)
    $deleteExitCode = $LASTEXITCODE
    foreach ($line in $deleteLines) {
      Write-Host $line
    }
    if ($deleteExitCode -ne 0) {
      throw "Rollback could not delete $FunctionName."
    }
    Wait-ForGroupedFunctionAbsence
    $rollbackStatus = 'removed'
  }
  return [ordered]@{
    status = $rollbackStatus
    function_name = $FunctionName
    expected_function_id = $ExpectedFunctionId
    observed_function_id = $observedFunctionId
  }
}

Set-Location $Root
if (-not (Test-Path -LiteralPath $ManifestPath)) {
  throw "Missing release manifest: $ManifestPath"
}
$script:Manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json

Invoke-CheckedCommand -FilePath 'node' -Arguments @(
  'scripts/verify-search-v2-beta3-grouped-packet.mjs',
  '--manifest-hash', $ExpectedManifest
)

$statusLines = @(git status --porcelain=v1 --untracked-files=no)
if ($LASTEXITCODE -ne 0) { throw 'git status failed.' }
if ($statusLines.Count -ne 0) {
  throw 'The tracked worktree must be clean before the release runner starts.'
}

$resolvedSource = (git rev-parse "$($script:Manifest.source_revision)").Trim()
if ($resolvedSource -ne "$($script:Manifest.source_revision)") {
  throw 'The pinned source revision is unavailable.'
}
$sourceTree = (git rev-parse "$resolvedSource`^{tree}").Trim()
if ($sourceTree -ne "$($script:Manifest.source_tree)") {
  throw 'The pinned source tree does not match the manifest.'
}
$stableBlob = (git rev-parse "$resolvedSource`:supabase/functions/mcp-search/index.ts").Trim()
if ($stableBlob -ne "$($script:Manifest.stable_route_blob)") {
  throw 'The stable mcp-search source does not match the manifest.'
}
$mainStableBlob = (git rev-parse 'main:supabase/functions/mcp-search/index.ts').Trim()
if ($mainStableBlob -ne $stableBlob) {
  throw 'The stable mcp-search source differs from main.'
}

$preFunctions = Get-Functions
$preGrouped = @(Get-MatchingFunction -Functions $preFunctions -Name $FunctionName)
if ($preGrouped.Count -ne 0) {
  throw "$FunctionName already exists. This one-use create-and-delete packet cannot run."
}
$preStable = Assert-StableFunctionPin -Functions $preFunctions
$sharedCandidatePreflight = Invoke-JsonCommand -FilePath 'node' -Arguments @(
  'scripts/manage-search-v2-shared-candidate-rpc.mjs',
  '--action', 'preflight',
  '--project-ref', $ProjectRef,
  '--expected-migration-hash', "$($script:Manifest.shared_candidate_rpc.migration_sha256)"
)
if ("$($sharedCandidatePreflight.status)" -ne 'ok') {
  throw 'The shared candidate RPC preflight did not pass.'
}

$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
$resolvedWorkspace = [System.IO.Path]::GetFullPath($Workspace)
if (-not $resolvedWorkspace.StartsWith("$resolvedRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'The release workspace is outside the repository.'
}
if (Test-Path -LiteralPath $Workspace) {
  Remove-Item -LiteralPath $Workspace -Recurse -Force
}
$sourceWorkspace = Join-Path $Workspace 'source'
Expand-GitRevision `
  -Revision $resolvedSource `
  -Destination $sourceWorkspace `
  -RepositoryRoot $Root

Invoke-CheckedCommand -FilePath 'deno' -Arguments @(
  'check',
  (Join-Path $sourceWorkspace 'supabase/functions/mcp-search-grouped/index.ts')
)
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-hosted-search-grouped-client.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-mcp-agent-friendly-errors.mjs')
Invoke-CheckedCommand -FilePath 'node' -Arguments @('scripts/verify-hosted-search-resilience.mjs')
Invoke-CheckedCommand -FilePath 'deno' -Arguments @(
  'run', '--allow-read', '--allow-env',
  'scripts/verify-search-v2-grouped-http-request.ts'
)

if (-not $ExecuteApprovedGroupedRelease) {
  [ordered]@{
    status = 'preflight_ok_no_mutation'
    source_revision = $resolvedSource
    source_tree = $sourceTree
    function_name = $FunctionName
    grouped_function_present_before = $false
    stable_function_id = "$($preStable.id)"
    stable_function_version = [int]$preStable.version
    shared_candidate_rpc_present_before = $false
    shared_candidate_migration_record_present_before = $false
    authorized_deployments = 0
    authorized_deletions = 0
    authorized_database_creations = 0
    authorized_database_rollbacks = 0
  } | ConvertTo-Json -Depth 4
  exit 0
}

foreach ($path in @($LiveEvidence, $LatencyEvidence, $CompletionEvidence, $RollbackEvidence)) {
  if (Test-Path -LiteralPath $path) {
    throw "This release packet is write-once and evidence already exists: $path"
  }
}

$sharedCandidateApplyAttempted = $false
$sharedCandidateApplied = $false
$sharedCandidateDefinitionSha256 = $null
$sharedCandidateDefinitionMd5 = $null
$deploymentAttempted = $false
$deployedFunction = $null
try {
  $sharedCandidateApplyAttempted = $true
  $sharedCandidateApply = Invoke-JsonCommand -FilePath 'node' -Arguments @(
    'scripts/manage-search-v2-shared-candidate-rpc.mjs',
    '--action', 'apply',
    '--project-ref', $ProjectRef,
    '--expected-migration-hash', "$($script:Manifest.shared_candidate_rpc.migration_sha256)"
  )
  if ("$($sharedCandidateApply.status)" -ne 'applied_and_verified') {
    throw 'The shared candidate RPC apply step did not verify.'
  }
  $sharedCandidateDefinitionSha256 = "$($sharedCandidateApply.function_definition_sha256)"
  $sharedCandidateDefinitionMd5 = "$($sharedCandidateApply.function_definition_md5)"
  if ($sharedCandidateDefinitionSha256 -notmatch '^[0-9a-f]{64}$') {
    throw 'The shared candidate RPC SHA-256 fingerprint is invalid.'
  }
  if ($sharedCandidateDefinitionMd5 -notmatch '^[0-9a-f]{32}$') {
    throw 'The shared candidate RPC database fingerprint is invalid.'
  }
  $sharedCandidateApplied = $true

  $deploymentAttempted = $true
  & npx supabase functions deploy $FunctionName `
    --project-ref $ProjectRef `
    --no-verify-jwt `
    --use-api `
    --workdir $sourceWorkspace
  if ($LASTEXITCODE -ne 0) {
    throw "Supabase function deploy failed for $FunctionName."
  }

  $deployedFunction = Wait-ForGroupedFunction

  Invoke-CheckedCommand -FilePath 'node' -Arguments @(
    'scripts/verify-search-v2-beta3-grouped-live.mjs',
    '--grouped-url', $GroupedUrl,
    '--stable-url', $StableUrl,
    '--output', $LiveEvidence,
    '--request-timeout-ms', '20000'
  )
  Invoke-CheckedCommand -FilePath 'node' -Arguments @(
    'scripts/measure-search-v2-beta3-fr47-live.mjs',
    '--package-root', (Join-Path $Root 'mcp'),
    '--grouped-url', $GroupedUrl,
    '--stable-url', $StableUrl,
    '--output', $LatencyEvidence,
    '--samples', '3',
    '--rate-window-reset-ms', '65000',
    '--timeout-ms', '20000'
  )

  $postFunctions = Get-Functions
  $postGrouped = @(Get-MatchingFunction -Functions $postFunctions -Name $FunctionName)
  if ($postGrouped.Count -ne 1) {
    throw "Expected one active $FunctionName after live verification."
  }
  if ("$($postGrouped[0].id)" -ne "$($deployedFunction.id)") {
    throw "The grouped function id changed during live verification."
  }
  Assert-ActiveFunction -Function $postGrouped[0] -Name $FunctionName
  Assert-StableFunctionPin -Functions $postFunctions | Out-Null
  $sharedCandidateVerify = Invoke-JsonCommand -FilePath 'node' -Arguments @(
    'scripts/manage-search-v2-shared-candidate-rpc.mjs',
    '--action', 'verify',
    '--project-ref', $ProjectRef,
    '--expected-migration-hash', "$($script:Manifest.shared_candidate_rpc.migration_sha256)",
    '--expected-definition-sha256', $sharedCandidateDefinitionSha256
  )
  if ("$($sharedCandidateVerify.status)" -ne 'present_and_verified') {
    throw 'The shared candidate RPC changed during live verification.'
  }

  Write-JsonEvidence -Path $CompletionEvidence -Value ([ordered]@{
    artifact = 'search_v2_beta3_shared_grouped_release_completion'
    status = 'published_and_verified'
    manifest_sha256 = $ExpectedManifest
    source_revision = $resolvedSource
    source_tree = $sourceTree
    function = [ordered]@{
      id = "$($postGrouped[0].id)"
      name = $FunctionName
      version = [int]$postGrouped[0].version
      updated_at = [long]$postGrouped[0].updated_at
      verify_jwt = $false
      status = "$($postGrouped[0].status)"
    }
    shared_candidate_rpc = [ordered]@{
      migration_version = "$($script:Manifest.shared_candidate_rpc.migration_version)"
      migration_sha256 = "$($script:Manifest.shared_candidate_rpc.migration_sha256)"
      function_definition_sha256 = $sharedCandidateDefinitionSha256
      function_definition_md5 = $sharedCandidateDefinitionMd5
      migration_recorded = $true
    }
    stable_function = [ordered]@{
      id = "$($preStable.id)"
      name = $StableFunctionName
      version = [int]$preStable.version
      updated_at = [long]$preStable.updated_at
      mutated = $false
    }
    live_evidence = 'references/verification/search-v2-beta3-shared-grouped-live-2026-07-21.json'
    latency_evidence = 'references/verification/search-v2-beta3-shared-fr47-live-2026-07-21.json'
    rollback_used = $false
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
}
catch {
  $releaseError = $_.Exception.Message
  $sharedCandidateInspectionError = $null
  if ($sharedCandidateApplyAttempted -and -not $sharedCandidateApplied) {
    try {
      $sharedCandidateInspection = Invoke-JsonCommand -FilePath 'node' -Arguments @(
        'scripts/manage-search-v2-shared-candidate-rpc.mjs',
        '--action', 'inspect',
        '--project-ref', $ProjectRef,
        '--expected-migration-hash', "$($script:Manifest.shared_candidate_rpc.migration_sha256)"
      )
      if ("$($sharedCandidateInspection.status)" -eq 'present_and_verified') {
        $sharedCandidateDefinitionSha256 =
          "$($sharedCandidateInspection.function_definition_sha256)"
        $sharedCandidateDefinitionMd5 =
          "$($sharedCandidateInspection.function_definition_md5)"
        if ($sharedCandidateDefinitionSha256 -notmatch '^[0-9a-f]{64}$') {
          throw 'Recovered shared candidate RPC SHA-256 fingerprint is invalid.'
        }
        if ($sharedCandidateDefinitionMd5 -notmatch '^[0-9a-f]{32}$') {
          throw 'Recovered shared candidate RPC database fingerprint is invalid.'
        }
        $sharedCandidateApplied = $true
      }
      elseif ("$($sharedCandidateInspection.status)" -ne 'absent') {
        throw 'The shared candidate RPC inspection returned an unknown state.'
      }
    }
    catch {
      $sharedCandidateInspectionError = $_.Exception.Message
    }
  }
  $endpointRollback = [ordered]@{
    status = 'not_attempted'
    function_name = $FunctionName
    expected_function_id = $null
    observed_function_id = $null
  }
  if ($deploymentAttempted) {
    $expectedRollbackFunctionId = if ($null -eq $deployedFunction) {
      $null
    } else {
      "$($deployedFunction.id)"
    }
    $endpointRollback = Remove-GroupedFunctionForRollback `
      -Reason $releaseError `
      -ExpectedFunctionId $expectedRollbackFunctionId
  }
  $sharedCandidateRollback = [ordered]@{
    status = if ($sharedCandidateInspectionError) {
      'blocked_unverified_state'
    } elseif ($sharedCandidateApplied) {
      'retained'
    } else {
      'not_applied'
    }
    migration_version = "$($script:Manifest.shared_candidate_rpc.migration_version)"
    migration_sha256 = "$($script:Manifest.shared_candidate_rpc.migration_sha256)"
    function_definition_sha256 = $sharedCandidateDefinitionSha256
    function_definition_md5 = $sharedCandidateDefinitionMd5
    error = $sharedCandidateInspectionError
  }
  $endpointRollbackBlocked = "$($endpointRollback.status)".StartsWith('blocked_')
  if ($sharedCandidateApplied -and -not $endpointRollbackBlocked) {
    try {
      $sharedCandidateRollbackResult = Invoke-JsonCommand -FilePath 'node' -Arguments @(
        'scripts/manage-search-v2-shared-candidate-rpc.mjs',
        '--action', 'rollback',
        '--project-ref', $ProjectRef,
        '--expected-migration-hash', "$($script:Manifest.shared_candidate_rpc.migration_sha256)",
        '--expected-definition-sha256', $sharedCandidateDefinitionSha256,
        '--expected-definition-md5', $sharedCandidateDefinitionMd5
      )
      if ("$($sharedCandidateRollbackResult.status)" -ne 'removed_and_verified') {
        throw 'The shared candidate RPC rollback did not verify.'
      }
      $sharedCandidateRollback.status = 'removed'
    }
    catch {
      $sharedCandidateRollback.status = 'blocked'
      $sharedCandidateRollback.error = $_.Exception.Message
    }
  }
  elseif ($sharedCandidateApplied -and $endpointRollbackBlocked) {
    $sharedCandidateRollback.status = 'retained_for_endpoint_dependency'
  }
  $rollbackSucceeded = (
    (-not $endpointRollbackBlocked) -and
    ("$($sharedCandidateRollback.status)" -in @('removed', 'not_applied'))
  )
  $overallRollbackStatus = if ($rollbackSucceeded) { 'removed' } else { 'blocked' }
  Write-JsonEvidence -Path $RollbackEvidence -Value ([ordered]@{
    artifact = 'search_v2_beta3_shared_grouped_release_rollback'
    status = $overallRollbackStatus
    endpoint = $endpointRollback
    shared_candidate_rpc = $sharedCandidateRollback
    stable_function_mutated = $false
    reason = $releaseError
    finished_at = (Get-Date).ToUniversalTime().ToString('o')
  })
  if ($endpointRollbackBlocked) {
    throw "Release failed and endpoint rollback was blocked. $releaseError"
  }
  if ("$($sharedCandidateRollback.status)".StartsWith('blocked')) {
    throw "Release failed and shared candidate RPC rollback was blocked. $releaseError"
  }
  throw
}
