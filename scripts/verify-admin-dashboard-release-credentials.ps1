$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'admin-dashboard-release-credentials.ps1')

function Assert-Equal {
  param(
    [Parameter(Mandatory = $true)][object]$Actual,
    [Parameter(Mandatory = $true)][object]$Expected,
    [Parameter(Mandatory = $true)][string]$Message
  )

  if ("$Actual" -cne "$Expected") {
    throw "$Message Expected '$Expected', received '$Actual'."
  }
}

$processReader = { param([string]$Name) if ($Name -eq 'ADMIN_SECRET') { 'process-value' } }
$userReader = { param([string]$Name) if ($Name -eq 'ADMIN_SECRET') { 'user-value' } }
$resolved = Resolve-AdminDashboardReleaseCredential `
  -Name ADMIN_SECRET `
  -ProcessReader $processReader `
  -UserReader $userReader
Assert-Equal $resolved.source 'process' 'Process scope must take precedence.'
Assert-Equal $resolved.value 'process-value' 'Process credential value mismatch.'

$emptyProcessReader = { param([string]$Name) '' }
$resolved = Resolve-AdminDashboardReleaseCredential `
  -Name ADMIN_SECRET `
  -ProcessReader $emptyProcessReader `
  -UserReader $userReader
Assert-Equal $resolved.source 'user' 'User scope must be the fallback.'
Assert-Equal $resolved.value 'user-value' 'User credential value mismatch.'

$missingRejected = $false
try {
  Resolve-AdminDashboardReleaseCredential `
    -Name ADMIN_SECRET `
    -ProcessReader $emptyProcessReader `
    -UserReader $emptyProcessReader | Out-Null
}
catch {
  $missingRejected = $_.Exception.Message -eq (
    'Required credential is missing: ADMIN_SECRET. Set it in the process or Windows user environment.'
  )
}
if (-not $missingRejected) {
  throw 'A missing credential must fail with the expected pre-mutation error.'
}

$target = 'PHASE_A_ADMIN_SECRET'
$previousTargetValue = [Environment]::GetEnvironmentVariable($target, 'Process')
try {
  [Environment]::SetEnvironmentVariable($target, 'existing-value', 'Process')
  $state = Set-AdminDashboardReleaseProcessCredential `
    -SourceName ADMIN_SECRET `
    -TargetName $target `
    -ProcessReader $emptyProcessReader `
    -UserReader $userReader
  Assert-Equal ([Environment]::GetEnvironmentVariable($target, 'Process')) 'user-value' (
    'Resolved credential was not copied to the target process variable.'
  )
  Assert-Equal $state.source 'user' 'Credential source was not retained safely.'
  Restore-AdminDashboardReleaseProcessCredential -State $state
  Assert-Equal ([Environment]::GetEnvironmentVariable($target, 'Process')) 'existing-value' (
    'Cleanup did not restore the prior process value.'
  )
}
finally {
  [Environment]::SetEnvironmentVariable($target, $previousTargetValue, 'Process')
}

$runner = Get-Content -LiteralPath (
  Join-Path $PSScriptRoot 'run-admin-dashboard-phase-a-admin-api-release.ps1'
) -Raw
if ($runner -match '\bRead-Host\b') {
  throw 'The release runner must not prompt for stored credentials.'
}
foreach ($name in @('SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'ADMIN_SECRET')) {
  if (-not $runner.Contains($name)) {
    throw "The release runner does not load $name."
  }
}
foreach ($targetName in @('SUPABASE_ACCESS_TOKEN', 'PGPASSWORD', 'PHASE_A_ADMIN_SECRET')) {
  if (-not $runner.Contains($targetName)) {
    throw "The release runner does not set or clean $targetName."
  }
}

Write-Output '{"status":"ok","cases":["process_precedence","user_fallback","missing_rejected","cleanup_restores","runner_has_no_prompts"]}'
