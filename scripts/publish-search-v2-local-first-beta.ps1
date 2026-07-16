param(
    [switch]$ExecuteApprovedPublication,
    [string]$ApprovedManifestSha256
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedPublication) {
    throw 'Publication is disabled. Pass -ExecuteApprovedPublication only after owner approval.'
}

if ($ApprovedManifestSha256 -notmatch '^[a-fA-F0-9]{64}$') {
    throw 'A valid approved manifest SHA-256 is required.'
}

function Get-NormalizedTextSha256([string]$Path) {
    $text = (Get-Content -Raw -LiteralPath $Path).Replace("`r`n", "`n").Replace("`r", "`n")
    $encoding = [System.Text.UTF8Encoding]::new($false)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha.ComputeHash($encoding.GetBytes($text)))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
}

function Invoke-NpmJson([string[]]$Arguments) {
    $output = & npm @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "npm command failed: npm $($Arguments -join ' ')"
    }
    return ($output | Out-String | ConvertFrom-Json)
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repoRoot 'docs\si-v2\search\reviews\search-v2-local-first-beta-publication-authorization-manifest-2026-07-16.json'
$actualManifestSha256 = Get-NormalizedTextSha256 $manifestPath
if ($actualManifestSha256 -ne $ApprovedManifestSha256.ToLowerInvariant()) {
    throw 'The current manifest does not match the owner-approved fingerprint.'
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
$publisherPath = Join-Path $repoRoot $manifest.artifacts.publisher
if ((Get-NormalizedTextSha256 $publisherPath) -ne $manifest.artifacts.publisher_sha256) {
    throw 'The guarded publisher changed after the manifest was prepared.'
}

$archivePath = Join-Path $repoRoot $manifest.package.archive_path
if (-not (Test-Path -LiteralPath $archivePath)) {
    throw 'The exact approved package archive is missing.'
}
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $archivePath).Hash.ToLowerInvariant() -ne $manifest.package.archive_sha256) {
    throw 'The package archive does not match the approved SHA-256.'
}
if ((Get-Item -LiteralPath $archivePath).Length -ne $manifest.package.archive_size_bytes) {
    throw 'The package archive size does not match the approved manifest.'
}

$packetVerifierPath = Join-Path $repoRoot $manifest.artifacts.packet_verifier
if ((Get-NormalizedTextSha256 $packetVerifierPath) -ne $manifest.artifacts.packet_verifier_sha256) {
    throw 'The packet verifier changed after the manifest was prepared.'
}
& node $packetVerifierPath --expected-manifest $ApprovedManifestSha256
if ($LASTEXITCODE -ne 0) {
    throw 'The publication packet verifier failed.'
}

$npmUser = & npm whoami
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($npmUser | Out-String))) {
    throw 'npm authentication is required. Run npm login directly in this terminal.'
}

$distTags = Invoke-NpmJson @('view', $manifest.package.name, 'dist-tags', '--json')
if ($distTags.latest -ne $manifest.package.latest_must_remain) {
    throw 'npm latest changed from the approved preflight value.'
}

$packageSpec = "$($manifest.package.name)@$($manifest.package.version)"
$probeOutput = & npm view $packageSpec version --json 2>&1
$probeExitCode = $LASTEXITCODE
if ($probeExitCode -eq 0) {
    throw 'The approved prerelease version already exists. Refusing to publish over it.'
}
if (($probeOutput | Out-String) -notmatch 'E404|No match found') {
    throw 'The prerelease absence check failed for a reason other than version not found.'
}

& npm publish $archivePath --tag $manifest.package.publish_tag --ignore-scripts
$publishExitCode = $LASTEXITCODE
if ($publishExitCode -ne 0) {
    $reconciliation = & npm view $packageSpec version --json 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw 'npm publication failed and the target version is not visible in the registry.'
    }
    if (($reconciliation | Out-String | ConvertFrom-Json) -ne $manifest.package.version) {
        throw 'npm publication returned an error and registry state is inconclusive.'
    }
}

$publishedDist = Invoke-NpmJson @('view', $packageSpec, 'dist', '--json')
if ($publishedDist.shasum -ne $manifest.package.npm_shasum) {
    throw 'The published npm shasum does not match the approved archive.'
}
if ($publishedDist.integrity -ne $manifest.package.npm_integrity) {
    throw 'The published npm integrity does not match the approved archive.'
}

$postPublishTags = Invoke-NpmJson @('view', $manifest.package.name, 'dist-tags', '--json')
if ($postPublishTags.latest -ne $manifest.package.latest_must_remain) {
    throw 'npm latest changed during prerelease publication.'
}
if ($postPublishTags.beta -ne $manifest.package.version) {
    throw 'The beta tag does not point to the approved prerelease.'
}

$smokePath = Join-Path $repoRoot $manifest.artifacts.published_smoke
& node $smokePath `
    --package-spec $packageSpec `
    --expected-version $manifest.package.version `
    --expected-route-fingerprint $manifest.search_contract.stdio_route_fingerprint
$smokeExitCode = $LASTEXITCODE
if ($smokeExitCode -ne 0) {
    & npm deprecate $packageSpec 'Beta verification failed. Do not install this prerelease.'
    if ($LASTEXITCODE -ne 0) {
        throw 'Published smoke failed and automatic deprecation also failed. Stop and reconcile npm state.'
    }
    throw 'Published smoke failed. The exact prerelease was deprecated and npm latest was left unchanged.'
}

Write-Output ([pscustomobject]@{
    status = 'published_and_smoke_verified'
    package = $packageSpec
    beta_tag = $postPublishTags.beta
    latest_tag = $postPublishTags.latest
    archive_sha256 = $manifest.package.archive_sha256
    stdio_route_fingerprint = $manifest.search_contract.stdio_route_fingerprint
    hosted_comparison_executed = $false
    deployments = 0
    database_mutations = 0
} | ConvertTo-Json -Depth 4)
