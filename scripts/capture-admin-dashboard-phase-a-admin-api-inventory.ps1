param(
  [string]$Output = 'references/verification/admin-dashboard-phase-a-admin-api-inventory-2026-07-16.json'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRef = 'kcjmkakdhsqplvasgkjv'
$FunctionName = 'admin-api'
$Root = Split-Path -Parent $PSScriptRoot
$OutputPath = Join-Path $Root $Output
$Workspace = Join-Path $Root 'tmp/admin-dashboard-phase-a-admin-api-inventory'
$Utf8NoBom = [System.Text.UTF8Encoding]::new($false)

function Get-FunctionName {
  param([Parameter(Mandatory = $true)][object]$Function)
  if ($Function.PSObject.Properties.Name -contains 'name') { return "$($Function.name)" }
  if ($Function.PSObject.Properties.Name -contains 'slug') { return "$($Function.slug)" }
  return ''
}

if (Test-Path -LiteralPath $OutputPath) {
  throw "Inventory evidence already exists: $OutputPath"
}

$resolvedRoot = [System.IO.Path]::GetFullPath($Root)
$resolvedWorkspace = [System.IO.Path]::GetFullPath($Workspace)
if (-not $resolvedWorkspace.StartsWith("$resolvedRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'The inventory workspace is outside the repository root.'
}
if (Test-Path -LiteralPath $Workspace) {
  Remove-Item -LiteralPath $Workspace -Recurse -Force
}
New-Item -ItemType Directory -Path $Workspace | Out-Null

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$functionOutput = @(& supabase functions list --project-ref $ProjectRef --output json 2>&1)
$functionExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($functionExitCode -ne 0) {
  throw "Supabase function inventory failed. $($functionOutput -join ' ')"
}
$functionJson = @($functionOutput | Where-Object { $_ -is [string] }) -join "`n"
$parsedFunctions = $functionJson | ConvertFrom-Json
$functions = @($parsedFunctions | ForEach-Object { $_ })
$matches = @($functions | Where-Object { (Get-FunctionName $_) -eq $FunctionName })
if ($matches.Count -ne 1) {
  throw "Expected exactly one $FunctionName function, found $($matches.Count)."
}
$function = $matches[0]

$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$downloadOutput = @(& supabase functions download $FunctionName `
  --project-ref $ProjectRef --use-api --workdir $Workspace 2>&1)
$downloadExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
$downloadSucceeded = $downloadExitCode -eq 0
$downloadedIndex = Join-Path $Workspace 'supabase/functions/admin-api/index.ts'
$downloadedIndexHash = $null
$matchingRevisions = @()

if ($downloadSucceeded -and (Test-Path -LiteralPath $downloadedIndex)) {
  $downloadedText = [System.IO.File]::ReadAllText($downloadedIndex).Replace("`r`n", "`n")
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $downloadedBytes = [System.Text.Encoding]::UTF8.GetBytes($downloadedText)
  $downloadedIndexHash = ([BitConverter]::ToString($sha.ComputeHash($downloadedBytes))).Replace('-', '').ToLowerInvariant()

  $revisions = @(git log --all --format=%H -- supabase/functions/admin-api/index.ts)
  foreach ($revision in $revisions) {
    $gitText = @(& git show "${revision}:supabase/functions/admin-api/index.ts" 2>$null) -join "`n"
    if ($LASTEXITCODE -ne 0) { continue }
    $gitHash = ([BitConverter]::ToString(
      $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$gitText`n"))
    )).Replace('-', '').ToLowerInvariant()
    if ($gitHash -eq $downloadedIndexHash) {
      $matchingRevisions += $revision
    }
  }
}

$record = [ordered]@{
  artifact = 'admin_dashboard_phase_a_admin_api_inventory'
  project_ref = $ProjectRef
  function_name = $FunctionName
  function = [ordered]@{
    id = "$($function.id)"
    name = Get-FunctionName $function
    version = [int]$function.version
    status = "$($function.status)"
    verify_jwt = "$($function.verify_jwt)".ToLowerInvariant() -eq 'true'
    updated_at = "$($function.updated_at)"
    updated_at_iso = [DateTimeOffset]::FromUnixTimeMilliseconds([Int64]$function.updated_at).UtcDateTime.ToString('o')
  }
  source_download = [ordered]@{
    succeeded = $downloadSucceeded
    index_sha256 = $downloadedIndexHash
    matching_git_revisions = $matchingRevisions
  }
  captured_at = [DateTime]::UtcNow.ToString('o')
  mutations = 0
}

[System.IO.File]::WriteAllText(
  $OutputPath,
  "$(ConvertTo-Json $record -Depth 8)`n",
  $Utf8NoBom
)
Write-Output $OutputPath
