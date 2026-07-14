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
    $measurementRunnerPath = '710d88083f9768c7bfa2d52fd6272a4e8edd519440f1bd694eb4d23938cb7b41'
    $measurementProfilePath = '5e8260820c401b5e70401a3580fcc7956336b4fe230a31cd9bf84777df2050ec'
    $sharedBetaRunnerPath = 'e7be5a51fb3d449285a4929c3e343b0134fa781ea56dbbbbe191938ed57ba1a9'
    $profileVerifierPath = 'ae929b27138c989fdfdc15150c7e04b09c6976a24e19effb504c84a1efe46dbb'
    $artifactVerifierPath = '3566158976047eede62c8556e998ec62fd2f722899182519574b262bbd6df96e'
}

foreach ($entry in $expectedHashes.GetEnumerator()) {
    if (-not (Test-Path -LiteralPath $entry.Key)) {
        throw "Required Packet 3 file is missing: $($entry.Key)"
    }
    $actualHash = (Get-FileHash -LiteralPath $entry.Key -Algorithm SHA256).Hash.ToLowerInvariant()
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
