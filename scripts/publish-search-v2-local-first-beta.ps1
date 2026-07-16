param(
    [switch]$ExecuteApprovedPublication,
    [string]$ApprovedManifestSha256,
    [switch]$RunRollbackSelfTest,
    [ValidateSet('integrity_mismatch', 'tag_mismatch')]
    [string]$RollbackTestScenario
)

$ErrorActionPreference = 'Stop'

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

function Invoke-NpmCommand([scriptblock]$Invoker, [string[]]$Arguments) {
    $result = & $Invoker $Arguments
    if ($null -eq $result -or $null -eq $result.ExitCode -or $null -eq $result.Output) {
        throw 'The npm command adapter returned an invalid result.'
    }
    return $result
}

function Convert-NpmJson([object]$Result, [string]$Description) {
    if ($Result.ExitCode -ne 0) {
        throw "$Description failed."
    }
    try {
        return ($Result.Output | ConvertFrom-Json)
    }
    catch {
        throw "$Description returned invalid JSON."
    }
}

function Test-PostPublicationRegistryState(
    [scriptblock]$NpmInvoker,
    [object]$Manifest,
    [string]$PackageSpec
) {
    $publishedDist = Convert-NpmJson `
        (Invoke-NpmCommand $NpmInvoker @('view', $PackageSpec, 'dist', '--json')) `
        'Published npm dist verification'
    if ($publishedDist.shasum -ne $Manifest.package.npm_shasum) {
        throw 'The published npm shasum does not match the approved archive.'
    }
    if ($publishedDist.integrity -ne $Manifest.package.npm_integrity) {
        throw 'The published npm integrity does not match the approved archive.'
    }

    $postPublishTags = Convert-NpmJson `
        (Invoke-NpmCommand $NpmInvoker @('view', $Manifest.package.name, 'dist-tags', '--json')) `
        'Post-publication npm tag verification'
    if ($postPublishTags.latest -ne $Manifest.package.latest_must_remain) {
        throw 'npm latest changed during prerelease publication.'
    }
    if ($postPublishTags.beta -ne $Manifest.package.version) {
        throw 'The beta tag does not point to the approved prerelease.'
    }

    return [pscustomobject]@{
        published_dist = $publishedDist
        dist_tags = $postPublishTags
    }
}

function Invoke-ExactPrereleaseRollback(
    [scriptblock]$NpmInvoker,
    [object]$Manifest,
    [string]$PackageSpec
) {
    $deprecationMessage = 'Beta verification failed. Do not install this prerelease.'
    $deprecateResult = Invoke-NpmCommand $NpmInvoker @('deprecate', $PackageSpec, $deprecationMessage)
    if ($deprecateResult.ExitCode -ne 0) {
        throw 'Exact prerelease deprecation failed. Stop and reconcile npm state without republishing.'
    }

    $recordedDeprecation = Convert-NpmJson `
        (Invoke-NpmCommand $NpmInvoker @('view', $PackageSpec, 'deprecated', '--json')) `
        'Exact prerelease deprecation verification'
    if ([string]::IsNullOrWhiteSpace([string]$recordedDeprecation)) {
        throw 'Exact prerelease deprecation could not be confirmed. Stop and reconcile npm state without republishing.'
    }

    $finalTags = Convert-NpmJson `
        (Invoke-NpmCommand $NpmInvoker @('view', $Manifest.package.name, 'dist-tags', '--json')) `
        'Post-deprecation npm tag verification'
    if ($finalTags.latest -ne $Manifest.package.latest_must_remain) {
        throw 'npm latest changed during rollback. Stop and reconcile npm state without republishing.'
    }

    return [pscustomobject]@{
        deprecated = $true
        exact_package = $PackageSpec
        latest_tag = $finalTags.latest
    }
}

function Invoke-PostPublicationValidation(
    [scriptblock]$NpmInvoker,
    [object]$Manifest,
    [string]$PackageSpec,
    [scriptblock]$SmokeVerifier
) {
    try {
        $registryState = Test-PostPublicationRegistryState $NpmInvoker $Manifest $PackageSpec
        & $SmokeVerifier
        return $registryState
    }
    catch {
        $verificationFailure = $_.Exception.Message
        try {
            $null = Invoke-ExactPrereleaseRollback $NpmInvoker $Manifest $PackageSpec
        }
        catch {
            throw "Post-publication verification failed: $verificationFailure Automatic deprecation could not be confirmed. $($_.Exception.Message)"
        }
        throw "Post-publication verification failed: $verificationFailure The exact prerelease was deprecated and npm latest was left unchanged."
    }
}

function Invoke-RollbackSelfTest([string]$Scenario) {
    if ([string]::IsNullOrWhiteSpace($Scenario)) {
        throw 'A rollback self-test scenario is required.'
    }

    $manifest = [pscustomobject]@{
        package = [pscustomobject]@{
            name = '@supericons/mcp'
            version = '0.4.19-beta.0'
            npm_shasum = 'approved-shasum'
            npm_integrity = 'approved-integrity'
            latest_must_remain = '0.4.17'
        }
    }
    $packageSpec = '@supericons/mcp@0.4.19-beta.0'
    $events = [System.Collections.Generic.List[string]]::new()
    $tagReadCount = 0
    $mockInvoker = {
        param([string[]]$NpmArguments)

        $command = $NpmArguments -join ' '
        $events.Add($command)

        if ($NpmArguments[0] -eq 'publish') {
            return [pscustomobject]@{ ExitCode = 0; Output = 'published' }
        }
        if ($NpmArguments[0] -eq 'deprecate') {
            return [pscustomobject]@{ ExitCode = 0; Output = 'deprecated' }
        }
        if ($NpmArguments[0] -eq 'view' -and $NpmArguments[1] -eq $packageSpec -and $NpmArguments[2] -eq 'dist') {
            $integrity = if ($Scenario -eq 'integrity_mismatch') { 'wrong-integrity' } else { 'approved-integrity' }
            return [pscustomobject]@{
                ExitCode = 0
                Output = (@{ shasum = 'approved-shasum'; integrity = $integrity } | ConvertTo-Json -Compress)
            }
        }
        if ($NpmArguments[0] -eq 'view' -and $NpmArguments[1] -eq '@supericons/mcp' -and $NpmArguments[2] -eq 'dist-tags') {
            $tagReadCount += 1
            $beta = if ($Scenario -eq 'tag_mismatch' -and $tagReadCount -eq 1) {
                '0.4.18-beta.0'
            }
            else {
                '0.4.19-beta.0'
            }
            return [pscustomobject]@{
                ExitCode = 0
                Output = (@{ latest = '0.4.17'; beta = $beta } | ConvertTo-Json -Compress)
            }
        }
        if ($NpmArguments[0] -eq 'view' -and $NpmArguments[1] -eq $packageSpec -and $NpmArguments[2] -eq 'deprecated') {
            return [pscustomobject]@{
                ExitCode = 0
                Output = ('Beta verification failed. Do not install this prerelease.' | ConvertTo-Json -Compress)
            }
        }
        return [pscustomobject]@{ ExitCode = 1; Output = "unsupported mock command: $command" }
    }.GetNewClosure()

    $publishResult = Invoke-NpmCommand $mockInvoker @('publish', 'approved.tgz', '--tag', 'beta', '--ignore-scripts')
    if ($publishResult.ExitCode -ne 0) {
        throw 'Rollback self-test publish setup failed.'
    }

    $verificationFailure = $null
    try {
        $null = Invoke-PostPublicationValidation $mockInvoker $manifest $packageSpec { return }
    }
    catch {
        $verificationFailure = $_.Exception.Message
    }
    if ([string]::IsNullOrWhiteSpace($verificationFailure)) {
        throw 'Rollback self-test did not produce the required verification failure.'
    }

    $publishCount = @($events | Where-Object { $_ -match '^publish ' }).Count
    $deprecationCount = @($events | Where-Object { $_ -match '^deprecate ' }).Count
    $latestMutationCount = @($events | Where-Object { $_ -match '^dist-tag ' }).Count
    if ($publishCount -ne 1 -or $deprecationCount -ne 1 -or $latestMutationCount -ne 0) {
        throw 'Rollback self-test command counts do not match the safety contract.'
    }

    return [pscustomobject]@{
        status = 'ok'
        scenario = $Scenario
        verification_failure = $verificationFailure
        publish_calls = $publishCount
        deprecation_calls = $deprecationCount
        latest_mutation_calls = $latestMutationCount
    }
}

if ($RunRollbackSelfTest) {
    if ($ExecuteApprovedPublication) {
        throw 'Rollback self-test and real publication cannot run together.'
    }
    Write-Output (Invoke-RollbackSelfTest $RollbackTestScenario | ConvertTo-Json -Depth 4)
    exit 0
}

if (-not $ExecuteApprovedPublication) {
    throw 'Publication is disabled. Pass -ExecuteApprovedPublication only after owner approval.'
}

if ($ApprovedManifestSha256 -notmatch '^[a-fA-F0-9]{64}$') {
    throw 'A valid approved manifest SHA-256 is required.'
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

$npmInvoker = {
    param([string[]]$NpmArguments)
    $output = & npm @NpmArguments 2>&1
    return [pscustomobject]@{
        ExitCode = $LASTEXITCODE
        Output = ($output | Out-String)
    }
}

$npmUser = Invoke-NpmCommand $npmInvoker @('whoami')
if ($npmUser.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($npmUser.Output)) {
    throw 'npm authentication is required. Run npm login directly in this terminal.'
}

$distTags = Convert-NpmJson `
    (Invoke-NpmCommand $npmInvoker @('view', $manifest.package.name, 'dist-tags', '--json')) `
    'npm preflight tag verification'
if ($distTags.latest -ne $manifest.package.latest_must_remain) {
    throw 'npm latest changed from the approved preflight value.'
}

$packageSpec = "$($manifest.package.name)@$($manifest.package.version)"
$probeResult = Invoke-NpmCommand $npmInvoker @('view', $packageSpec, 'version', '--json')
if ($probeResult.ExitCode -eq 0) {
    throw 'The approved prerelease version already exists. Refusing to publish over it.'
}
if ($probeResult.Output -notmatch 'E404|No match found') {
    throw 'The prerelease absence check failed for a reason other than version not found.'
}

$publicationVisible = $false
$publishResult = Invoke-NpmCommand $npmInvoker @('publish', $archivePath, '--tag', $manifest.package.publish_tag, '--ignore-scripts')
if ($publishResult.ExitCode -eq 0) {
    $publicationVisible = $true
}
else {
    $reconciliationResult = Invoke-NpmCommand $npmInvoker @('view', $packageSpec, 'version', '--json')
    if ($reconciliationResult.ExitCode -eq 0) {
        $reconciledVersion = Convert-NpmJson $reconciliationResult 'npm publication reconciliation'
        if ($reconciledVersion -eq $manifest.package.version) {
            $publicationVisible = $true
        }
    }
    if (-not $publicationVisible) {
        throw 'npm publication returned an error and visibility is inconclusive. Do not rerun. Reconcile the exact version first.'
    }
}

$smokeVerifier = {
    $smokePath = Join-Path $repoRoot $manifest.artifacts.published_smoke
    & node $smokePath `
        --package-spec $packageSpec `
        --expected-version $manifest.package.version `
        --expected-route-fingerprint $manifest.search_contract.stdio_route_fingerprint
    if ($LASTEXITCODE -ne 0) {
        throw 'The clean-installed published-package smoke failed.'
    }
}.GetNewClosure()
$registryState = Invoke-PostPublicationValidation $npmInvoker $manifest $packageSpec $smokeVerifier

Write-Output ([pscustomobject]@{
    status = 'published_and_smoke_verified'
    package = $packageSpec
    beta_tag = $registryState.dist_tags.beta
    latest_tag = $registryState.dist_tags.latest
    archive_sha256 = $manifest.package.archive_sha256
    stdio_route_fingerprint = $manifest.search_contract.stdio_route_fingerprint
    hosted_comparison_executed = $false
    deployments = 0
    database_mutations = 0
} | ConvertTo-Json -Depth 4)
