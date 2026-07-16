param(
    [switch]$ExecuteApprovedPublication,
    [string]$ApprovedManifestSha256,
    [switch]$PromptForNpmOtp,
    [switch]$RunRollbackSelfTest,
    [switch]$RunNativeCommandCaptureSelfTest,
    [switch]$RunOtpEnvironmentSelfTest,
    [switch]$RunAttemptBudgetSelfTest,
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

function Invoke-NpmPublishWithOtp(
    [scriptblock]$NpmInvoker,
    [string[]]$Arguments,
    [System.Security.SecureString]$SecureOtp
) {
    $previousOtp = [Environment]::GetEnvironmentVariable('NPM_CONFIG_OTP', 'Process')
    $plainOtp = $null
    try {
        if ($null -ne $SecureOtp) {
            $plainOtp = [System.Net.NetworkCredential]::new('', $SecureOtp).Password
            if ($plainOtp -notmatch '^\d{6}$') {
                throw 'The npm one-time password must contain exactly six digits.'
            }
            [Environment]::SetEnvironmentVariable('NPM_CONFIG_OTP', $plainOtp, 'Process')
        }
        return Invoke-NpmCommand $NpmInvoker $Arguments
    }
    finally {
        [Environment]::SetEnvironmentVariable('NPM_CONFIG_OTP', $previousOtp, 'Process')
        $plainOtp = $null
    }
}

function Test-SecureOtpFormat([System.Security.SecureString]$SecureOtp) {
    if ($null -eq $SecureOtp) {
        throw 'A secure npm one-time password is required.'
    }
    $plainOtp = $null
    try {
        $plainOtp = [System.Net.NetworkCredential]::new('', $SecureOtp).Password
        if ($plainOtp -notmatch '^\d{6}$') {
            throw 'The npm one-time password must contain exactly six digits.'
        }
    }
    finally {
        $plainOtp = $null
    }
}

function Get-PublicationAttemptReceiptPath([string]$ManifestSha256) {
    $localStateRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if ([string]::IsNullOrWhiteSpace($localStateRoot)) {
        throw 'Local application data is unavailable, so the publish-command allowance cannot be protected.'
    }
    return Join-Path `
        (Join-Path $localStateRoot 'Supericons\release-attempts') `
        "$ManifestSha256.json"
}

function New-PublicationAttemptReceipt(
    [string]$Path,
    [string]$ManifestSha256,
    [string]$PackageSpec
) {
    $directory = Split-Path -Parent $Path
    $null = New-Item -ItemType Directory -Path $directory -Force
    $payload = [pscustomobject]@{
        schema_version = 1
        manifest_sha256 = $ManifestSha256
        package = $PackageSpec
        action = 'npm_publish_command_reserved'
        reserved_at_utc = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json -Compress
    $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($payload)
    $stream = $null
    try {
        $stream = [System.IO.File]::Open(
            $Path,
            [System.IO.FileMode]::CreateNew,
            [System.IO.FileAccess]::Write,
            [System.IO.FileShare]::None
        )
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Flush($true)
    }
    catch {
        if (Test-Path -LiteralPath $Path) {
            throw 'The publish-command allowance for this manifest is already consumed. Do not rerun it.'
        }
        throw "The publish-command allowance could not be recorded safely. $($_.Exception.Message)"
    }
    finally {
        if ($null -ne $stream) {
            $stream.Dispose()
        }
    }
    return $Path
}

function Invoke-BoundedNpmPublish(
    [scriptblock]$NpmInvoker,
    [string[]]$Arguments,
    [System.Security.SecureString]$SecureOtp,
    [string]$ReceiptPath,
    [string]$ManifestSha256,
    [string]$PackageSpec,
    [bool]$PreflightPassed
) {
    if (-not $PreflightPassed) {
        throw 'Publication preflight did not pass, so no publish command is allowed.'
    }
    Test-SecureOtpFormat $SecureOtp
    $null = New-PublicationAttemptReceipt $ReceiptPath $ManifestSha256 $PackageSpec
    return Invoke-NpmPublishWithOtp $NpmInvoker $Arguments $SecureOtp
}

function Invoke-NativeCommandResult([string]$Executable, [string[]]$Arguments) {
    $previousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $output = & $Executable @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }
    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = ($output | Out-String)
    }
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

function Invoke-AttemptBudgetSelfTest {
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "supericons-publish-budget-$([guid]::NewGuid().ToString('N'))"
    $receiptPath = Join-Path $temporaryRoot 'attempt.json'
    $manifestSha256 = 'a' * 64
    $packageSpec = '@supericons/mcp@0.4.19-beta.0'
    $script:AttemptBudgetPublishCalls = 0
    $mockInvoker = {
        param([string[]]$NpmArguments)
        if ($NpmArguments[0] -eq 'publish') {
            $script:AttemptBudgetPublishCalls += 1
        }
        return [pscustomobject]@{ ExitCode = 1; Output = 'EOTP test rejection' }
    }
    $validOtp = ConvertTo-SecureString '123456' -AsPlainText -Force
    $invalidOtp = ConvertTo-SecureString '12x456' -AsPlainText -Force
    try {
        $preflightRejected = $false
        try {
            $null = Invoke-BoundedNpmPublish `
                $mockInvoker @('publish', 'approved.tgz') $validOtp `
                $receiptPath $manifestSha256 $packageSpec $false
        }
        catch {
            $preflightRejected = $_.Exception.Message -match 'preflight did not pass'
        }
        if (-not $preflightRejected -or (Test-Path -LiteralPath $receiptPath) -or $script:AttemptBudgetPublishCalls -ne 0) {
            throw 'Attempt-budget self-test consumed an allowance during failed preflight.'
        }

        $invalidOtpRejected = $false
        try {
            $null = Invoke-BoundedNpmPublish `
                $mockInvoker @('publish', 'approved.tgz') $invalidOtp `
                $receiptPath $manifestSha256 $packageSpec $true
        }
        catch {
            $invalidOtpRejected = $_.Exception.Message -match 'exactly six digits'
        }
        if (-not $invalidOtpRejected -or (Test-Path -LiteralPath $receiptPath) -or $script:AttemptBudgetPublishCalls -ne 0) {
            throw 'Attempt-budget self-test consumed an allowance for an invalid OTP.'
        }

        $firstResult = Invoke-BoundedNpmPublish `
            $mockInvoker @('publish', 'approved.tgz') $validOtp `
            $receiptPath $manifestSha256 $packageSpec $true
        if ($firstResult.ExitCode -ne 1 -or $script:AttemptBudgetPublishCalls -ne 1) {
            throw 'Attempt-budget self-test did not issue exactly one first publish command.'
        }

        $secondRejected = $false
        try {
            $null = Invoke-BoundedNpmPublish `
                $mockInvoker @('publish', 'approved.tgz') $validOtp `
                $receiptPath $manifestSha256 $packageSpec $true
        }
        catch {
            $secondRejected = $_.Exception.Message -match 'already consumed'
        }
        if (-not $secondRejected -or $script:AttemptBudgetPublishCalls -ne 1) {
            throw 'Attempt-budget self-test allowed a second publish command.'
        }

        $receiptText = Get-Content -Raw -LiteralPath $receiptPath
        $receipt = $receiptText | ConvertFrom-Json
        if (
            $receipt.manifest_sha256 -ne $manifestSha256 -or
            $receipt.package -ne $packageSpec -or
            $receipt.action -ne 'npm_publish_command_reserved' -or
            $receiptText -match '123456|12x456|otp|password|credential'
        ) {
            throw 'Attempt-budget receipt is invalid or contains credential material.'
        }

        return [pscustomobject]@{
            status = 'ok'
            failed_preflight_publish_calls = 0
            invalid_otp_publish_calls = 0
            first_execution_publish_calls = 1
            second_execution_publish_calls = 0
            receipt_manifest_bound = $true
            receipt_contains_credentials = $false
        }
    }
    finally {
        $validOtp = $null
        $invalidOtp = $null
        Remove-Variable AttemptBudgetPublishCalls -Scope Script -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ($RunRollbackSelfTest) {
    if ($ExecuteApprovedPublication -or $RunNativeCommandCaptureSelfTest -or $RunOtpEnvironmentSelfTest -or $RunAttemptBudgetSelfTest) {
        throw 'Rollback self-test and real publication cannot run together.'
    }
    Write-Output (Invoke-RollbackSelfTest $RollbackTestScenario | ConvertTo-Json -Depth 4)
    exit 0
}

if ($RunNativeCommandCaptureSelfTest) {
    if ($ExecuteApprovedPublication -or $RunOtpEnvironmentSelfTest -or $RunAttemptBudgetSelfTest) {
        throw 'Native command self-test and real publication cannot run together.'
    }
    $nodeExecutable = (Get-Command node -ErrorAction Stop).Source
    $capture = Invoke-NativeCommandResult $nodeExecutable @(
        '-e',
        "process.stderr.write('E404 expected absence probe'); process.exit(1)"
    )
    if ($capture.ExitCode -ne 1 -or $capture.Output -notmatch 'E404 expected absence probe') {
        throw 'Native command self-test did not capture the expected nonzero result.'
    }
    Write-Output ([pscustomobject]@{
        status = 'ok'
        exit_code = $capture.ExitCode
        expected_absence_captured = $true
    } | ConvertTo-Json -Depth 3)
    exit 0
}

if ($RunOtpEnvironmentSelfTest) {
    if ($ExecuteApprovedPublication -or $RunAttemptBudgetSelfTest) {
        throw 'OTP environment self-test and real publication cannot run together.'
    }
    $script:OtpSelfTestObserved = $null
    $mockInvoker = {
        param([string[]]$NpmArguments)
        $script:OtpSelfTestObserved = [Environment]::GetEnvironmentVariable('NPM_CONFIG_OTP', 'Process')
        return [pscustomobject]@{
            ExitCode = 0
            Output = ($NpmArguments -join ' ')
        }
    }
    $previousOtp = [Environment]::GetEnvironmentVariable('NPM_CONFIG_OTP', 'Process')
    $secureOtp = ConvertTo-SecureString '123456' -AsPlainText -Force
    $null = Invoke-NpmPublishWithOtp $mockInvoker @('publish', 'approved.tgz') $secureOtp
    $restoredOtp = [Environment]::GetEnvironmentVariable('NPM_CONFIG_OTP', 'Process')
    if ($script:OtpSelfTestObserved -ne '123456' -or $restoredOtp -ne $previousOtp) {
        throw 'OTP environment self-test did not inject and restore the temporary value.'
    }
    Remove-Variable OtpSelfTestObserved -Scope Script -ErrorAction SilentlyContinue
    Write-Output ([pscustomobject]@{
        status = 'ok'
        otp_observed_by_child = $true
        prior_environment_restored = $true
    } | ConvertTo-Json -Depth 3)
    exit 0
}

if ($RunAttemptBudgetSelfTest) {
    if ($ExecuteApprovedPublication) {
        throw 'Attempt-budget self-test and real publication cannot run together.'
    }
    Write-Output (Invoke-AttemptBudgetSelfTest | ConvertTo-Json -Depth 4)
    exit 0
}

if (-not $ExecuteApprovedPublication) {
    throw 'Publication is disabled. Pass -ExecuteApprovedPublication only for a bounded, independently audited release.'
}

if ($ApprovedManifestSha256 -notmatch '^[a-fA-F0-9]{64}$') {
    throw 'A valid approved manifest SHA-256 is required.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repoRoot 'docs\si-v2\search\reviews\search-v2-local-first-beta-publication-authorization-manifest-2026-07-16.json'
$actualManifestSha256 = Get-NormalizedTextSha256 $manifestPath
if ($actualManifestSha256 -ne $ApprovedManifestSha256.ToLowerInvariant()) {
    throw 'The current manifest does not match the audited release fingerprint.'
}

$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifest.package.requires_interactive_otp -and -not $PromptForNpmOtp) {
    throw 'This publication requires -PromptForNpmOtp so the owner can enter the npm code directly in the terminal.'
}
if ($manifest.publication_attempts.maximum_additional_publish_commands -ne 1) {
    throw 'This publisher supports exactly one remaining manifest-bound publish command.'
}
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
    return Invoke-NativeCommandResult 'npm' $NpmArguments
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
$secureOtp = if ($PromptForNpmOtp) {
    Read-Host 'npm one-time password' -AsSecureString
}
else {
    $null
}
$attemptReceiptPath = Get-PublicationAttemptReceiptPath $actualManifestSha256
try {
    $publishResult = Invoke-BoundedNpmPublish `
        $npmInvoker `
        @('publish', $archivePath, '--tag', $manifest.package.publish_tag, '--ignore-scripts') `
        $secureOtp `
        $attemptReceiptPath `
        $actualManifestSha256 `
        $packageSpec `
        $true
}
finally {
    $secureOtp = $null
}
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
        if ($publishResult.Output -match 'EOTP|one-time password') {
            throw 'npm rejected the one-time password and the target version is absent. This manifest allowance is consumed. Do not rerun without a new independently audited manifest.'
        }
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
