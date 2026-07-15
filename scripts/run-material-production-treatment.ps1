param(
    [switch]$ExecuteApprovedMaterialProductionTreatment
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedMaterialProductionTreatment) {
    throw 'This runner is limited to an owner-approved Material production treatment measurement.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$measurementRunnerPath = Join-Path $PSScriptRoot 'run-material-production-latency-treatment.mjs'
$measurementProfilePath = Join-Path $PSScriptRoot 'lib\search-measurement-profile.mjs'
$sharedBetaRunnerPath = Join-Path $PSScriptRoot 'run-search-v2-latency-measurement.mjs'
$profileVerifierPath = Join-Path $PSScriptRoot 'verify-material-production-latency-profile.mjs'
$artifactVerifierPath = Join-Path $PSScriptRoot 'verify-material-production-treatment-artifacts.mjs'
$baselineSearchPath = Join-Path $repoRoot 'tmp\material-baseline-search.json'
$baselineRecommendationPath = Join-Path $repoRoot 'tmp\material-baseline-recommendation.json'
$treatmentSearchPath = Join-Path $repoRoot 'tmp\material-treatment-search.json'
$treatmentRecommendationPath = Join-Path $repoRoot 'tmp\material-treatment-recommendation.json'
$releaseFingerprint = '534b6bb9e1405a6a15096081f8245117f5f470cdf22044c57640d06afa393b5a'

$expectedTextHashes = @{
    $measurementRunnerPath = 'f62a507623057bc88fdaffb0f8ea9f6769e3fa4a457224f4316fb6586cf4c958'
    $measurementProfilePath = '155a2391296732730d31a11556d54669e959c724613718c90b895da100970b2a'
    $sharedBetaRunnerPath = '774d698b94afa7adc40104226f603b9d13b3c07539eb7c7c9aa81904cf011018'
    $profileVerifierPath = '4d3420f8a25320e202320e2080bb266ca0af08929cbdd0e0d98d65ffcdb2c4dd'
    $artifactVerifierPath = '2521fb0cfaf2dac7b44c7ec3db4e5453a312484f5aeae637dc4741727c7c275b'
    $baselineSearchPath = '0344385fd16aac5aa6e55ff2a5dd5fd82f5f1f86230025025922ea1de27332ae'
    $baselineRecommendationPath = '151ec835b5ac0e510510f692f395eee2169e461606470b9fae14a4c6714cea99'
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

foreach ($entry in $expectedTextHashes.GetEnumerator()) {
    if (-not (Test-Path -LiteralPath $entry.Key)) {
        throw "Required Packet 5 treatment file is missing: $($entry.Key)"
    }
    $actualHash = Get-NormalizedTextSha256 -Path $entry.Key
    if ($actualHash -ne $entry.Value) {
        throw "Packet 5 treatment file hash changed: $($entry.Key)"
    }
}

if ([Environment]::GetEnvironmentVariable('SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT')) {
    throw 'SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT is already set and could shadow the stable endpoint guard.'
}
foreach ($outputPath in @($treatmentSearchPath, $treatmentRecommendationPath)) {
    if (Test-Path -LiteralPath $outputPath) {
        throw "Packet 5 treatment output already exists and will not be overwritten: $outputPath"
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
        --variant treatment `
        --output $treatmentSearchPath `
        --manifest-hash $releaseFingerprint
    if ($LASTEXITCODE -ne 0) {
        throw 'Material production search treatment failed. Do not rerun without inspection and approval.'
    }

    & node $measurementRunnerPath `
        --mode recommendation `
        --variant treatment `
        --recommendation-path grouped `
        --output $treatmentRecommendationPath `
        --manifest-hash $releaseFingerprint
    if ($LASTEXITCODE -ne 0) {
        throw 'Material production recommendation treatment failed. Do not rerun without inspection and approval.'
    }

    & node $artifactVerifierPath `
        --baseline-search $baselineSearchPath `
        --baseline-recommendation $baselineRecommendationPath `
        --treatment-search $treatmentSearchPath `
        --treatment-recommendation $treatmentRecommendationPath
    if ($LASTEXITCODE -ne 0) {
        throw 'Material production treatment comparison failed. Stop Packet 5 and follow its rollback gate.'
    }

    Write-Output "Material production treatment completed: $treatmentSearchPath and $treatmentRecommendationPath"
}
finally {
    Remove-Item Env:SUPERICONS_SEARCH_V2_MEASUREMENT_ENDPOINT -ErrorAction SilentlyContinue
}
