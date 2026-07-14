param(
    [switch]$ExecuteApprovedMaterialProductionBaseline
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedMaterialProductionBaseline) {
    throw 'This runner is limited to an owner-approved Material production baseline. Pass -ExecuteApprovedMaterialProductionBaseline to continue.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$measurementRunnerPath = Join-Path $PSScriptRoot 'run-material-production-latency-baseline.mjs'
$measurementProfilePath = Join-Path $PSScriptRoot 'lib\search-measurement-profile.mjs'
$sharedBetaRunnerPath = Join-Path $PSScriptRoot 'run-search-v2-latency-measurement.mjs'
$profileVerifierPath = Join-Path $PSScriptRoot 'verify-material-production-latency-profile.mjs'
$artifactVerifierPath = Join-Path $PSScriptRoot 'verify-material-production-latency-artifacts.mjs'
$searchOutputPath = Join-Path $repoRoot 'tmp\material-baseline-search.json'
$recommendationOutputPath = Join-Path $repoRoot 'tmp\material-baseline-recommendation.json'
$releaseFingerprint = '534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a'

$expectedHashes = @{
    $measurementRunnerPath = 'ccc227f446ae18ec0212bb2582e5bfe3cf1c6297a935bc648e2c22576cb4f719'
    $measurementProfilePath = '155a2391296732730d31a11556d54669e959c724613718c90b895da100970b2a'
    $sharedBetaRunnerPath = '774d698b94afa7adc40104226f603b9d13b3c07539eb7c7c9aa81904cf011018'
    $profileVerifierPath = '4d3420f8a25320e202320e2080bb266ca0af08929cbdd0e0d98d65ffcdb2c4dd'
    $artifactVerifierPath = 'cb242285317dae13a4cec97c05523b24cd116da364161a0363b809045f39b40c'
}

function Get-NormalizedTextSha256 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $text = [System.IO.File]::ReadAllText($Path)
    $normalized = $text.Replace("`r`n", "`n").Replace("`r", "`n")
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        return [System.BitConverter]::ToString(
            $sha256.ComputeHash($utf8.GetBytes($normalized))
        ).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha256.Dispose()
    }
}

foreach ($entry in $expectedHashes.GetEnumerator()) {
    if (-not (Test-Path -LiteralPath $entry.Key)) {
        throw "Required Packet 3 file is missing: $($entry.Key)"
    }
    $actualHash = Get-NormalizedTextSha256 -Path $entry.Key
    if ($actualHash -ne $entry.Value) {
        throw "Packet 3 file hash changed: $($entry.Key)"
    }
}

if ([Environment]::GetEnvironmentVariable('SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT')) {
    throw 'SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT is already set and could shadow the stable endpoint guard.'
}
foreach ($outputPath in @($searchOutputPath, $recommendationOutputPath)) {
    if (Test-Path -LiteralPath $outputPath) {
        throw "Packet 3 output already exists and will not be overwritten: $outputPath"
    }
}

& node $profileVerifierPath
if ($LASTEXITCODE -ne 0) {
    throw 'Material production latency profile verification failed.'
}

try {
    $env:SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT = 'mcp-search'

    & node $measurementRunnerPath `
        --mode search `
        --variant control `
        --output $searchOutputPath `
        --manifest-hash $releaseFingerprint
    if ($LASTEXITCODE -ne 0) {
        throw 'Material production search baseline failed. Do not rerun without inspection and approval.'
    }

    & node $measurementRunnerPath `
        --mode recommendation `
        --variant control `
        --recommendation-path grouped `
        --output $recommendationOutputPath `
        --manifest-hash $releaseFingerprint
    if ($LASTEXITCODE -ne 0) {
        throw 'Material production recommendation baseline failed. Do not rerun without inspection and approval.'
    }

    & node $artifactVerifierPath `
        --search $searchOutputPath `
        --recommendation $recommendationOutputPath `
        --manifest-hash $releaseFingerprint
    if ($LASTEXITCODE -ne 0) {
        throw 'Material production baseline artifact verification failed. Do not rerun without inspection and approval.'
    }

    Write-Output "Material production baselines completed: $searchOutputPath and $recommendationOutputPath"
}
finally {
    Remove-Item Env:SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT -ErrorAction SilentlyContinue
}
