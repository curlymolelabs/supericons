param(
    [switch]$ExecuteApprovedStaging,
    [string]$ApprovedManifestSha256,
    [switch]$RunStageAttemptSelfTest,
    [switch]$RunStagedVerificationSelfTest
)

$ErrorActionPreference = 'Stop'
$NpmStageCliVersion = '11.18.0'

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

function Invoke-NativeCommandResult(
    [string]$Executable,
    [string[]]$Arguments,
    [string]$WorkingDirectory = ''
) {
    $previousErrorActionPreference = $ErrorActionPreference
    $pushed = $false
    try {
        if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
            Push-Location -LiteralPath $WorkingDirectory
            $pushed = $true
        }
        $ErrorActionPreference = 'Continue'
        $output = & $Executable @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
        if ($pushed) {
            Pop-Location
        }
    }
    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = ($output | Out-String)
    }
}

function Convert-CommandJson([object]$Result, [string]$Description) {
    if ($Result.ExitCode -ne 0) {
        throw "$Description failed."
    }
    $text = [string]$Result.Output
    $objectStart = $text.IndexOf('{')
    $arrayStart = $text.IndexOf('[')
    if ($objectStart -lt 0) {
        $start = $arrayStart
        $closing = ']'
    }
    elseif ($arrayStart -lt 0 -or $objectStart -lt $arrayStart) {
        $start = $objectStart
        $closing = '}'
    }
    else {
        $start = $arrayStart
        $closing = ']'
    }
    if ($start -lt 0) {
        throw "$Description returned no JSON value."
    }
    $end = $text.LastIndexOf($closing)
    if ($end -lt $start) {
        throw "$Description returned incomplete JSON."
    }
    try {
        return ($text.Substring($start, $end - $start + 1) | ConvertFrom-Json)
    }
    catch {
        throw "$Description returned invalid JSON."
    }
}

function Get-StageAttemptReceiptPath([string]$ManifestSha256) {
    $localStateRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if ([string]::IsNullOrWhiteSpace($localStateRoot)) {
        throw 'Local application data is unavailable, so the staging allowance cannot be protected.'
    }
    return Join-Path `
        (Join-Path $localStateRoot 'Supericons\release-stage-attempts') `
        "$ManifestSha256.json"
}

function New-StageAttemptReceipt(
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
        action = 'npm_stage_publish_reserved'
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
            throw 'The staging allowance for this manifest is already consumed. Do not rerun it.'
        }
        throw "The staging allowance could not be recorded safely. $($_.Exception.Message)"
    }
    finally {
        if ($null -ne $stream) {
            $stream.Dispose()
        }
    }
}

function Invoke-BoundedStagePublish(
    [scriptblock]$StageInvoker,
    [string[]]$Arguments,
    [string]$ReceiptPath,
    [string]$ManifestSha256,
    [string]$PackageSpec,
    [bool]$PreflightPassed
) {
    if (-not $PreflightPassed) {
        throw 'Staging preflight did not pass, so no staging command is allowed.'
    }
    New-StageAttemptReceipt $ReceiptPath $ManifestSha256 $PackageSpec
    return (& $StageInvoker $Arguments)
}

function Invoke-StageAttemptSelfTest {
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "supericons-stage-budget-$([guid]::NewGuid().ToString('N'))"
    $receiptPath = Join-Path $temporaryRoot 'attempt.json'
    $manifestSha256 = 'a' * 64
    $packageSpec = '@supericons/mcp@0.4.19-beta.1'
    $stageAttemptCounter = [pscustomobject]@{ Count = 0 }
    $stageId = '11111111-1111-4111-8111-111111111111'
    $mockInvoker = {
        param([string[]]$StageArguments)
        $stageAttemptCounter.Count += 1
        return [pscustomobject]@{
            ExitCode = 0
            Output = (@{
                '@supericons/mcp' = @{
                    id = $packageSpec
                    name = '@supericons/mcp'
                    version = '0.4.19-beta.1'
                    stageId = $stageId
                }
            } | ConvertTo-Json -Compress)
        }
    }.GetNewClosure()
    try {
        $failedPreflightRejected = $false
        try {
            $null = Invoke-BoundedStagePublish `
                $mockInvoker @('stage', 'publish') $receiptPath $manifestSha256 $packageSpec $false
        }
        catch {
            $failedPreflightRejected = $_.Exception.Message -match 'preflight did not pass'
        }
        if (-not $failedPreflightRejected -or (Test-Path -LiteralPath $receiptPath) -or $stageAttemptCounter.Count -ne 0) {
            throw 'Stage-attempt self-test consumed the allowance during failed preflight.'
        }

        $firstResult = Invoke-BoundedStagePublish `
            $mockInvoker @('stage', 'publish') $receiptPath $manifestSha256 $packageSpec $true
        $stageJson = Convert-CommandJson $firstResult 'Mock staged publication'
        $packageResult = $stageJson.PSObject.Properties['@supericons/mcp'].Value
        if ($stageAttemptCounter.Count -ne 1 -or $packageResult.stageId -ne $stageId) {
            throw 'Stage-attempt self-test did not issue exactly one valid staging command.'
        }

        $secondRejected = $false
        try {
            $null = Invoke-BoundedStagePublish `
                $mockInvoker @('stage', 'publish') $receiptPath $manifestSha256 $packageSpec $true
        }
        catch {
            $secondRejected = $_.Exception.Message -match 'already consumed'
        }
        if (-not $secondRejected -or $stageAttemptCounter.Count -ne 1) {
            throw 'Stage-attempt self-test allowed a second staging command.'
        }

        $receiptText = Get-Content -Raw -LiteralPath $receiptPath
        $receipt = $receiptText | ConvertFrom-Json
        if (
            $receipt.manifest_sha256 -ne $manifestSha256 -or
            $receipt.package -ne $packageSpec -or
            $receipt.action -ne 'npm_stage_publish_reserved' -or
            $receiptText -match 'otp|password|credential|token'
        ) {
            throw 'Stage-attempt receipt is invalid or contains credential material.'
        }

        return [pscustomobject]@{
            status = 'ok'
            failed_preflight_stage_calls = 0
            first_execution_stage_calls = 1
            second_execution_stage_calls = 0
            stage_id_captured = $true
            receipt_manifest_bound = $true
            receipt_contains_credentials = $false
        }
    }
    finally {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Complete-StagedArchiveVerification(
    [object]$DownloadResult,
    [string]$DownloadRoot,
    [string]$ExpectedArchiveSha256,
    [scriptblock]$SmokeInvoker,
    [string]$StageRecordPath,
    [object]$StageRecord
) {
    if ($null -eq $DownloadResult -or $DownloadResult.ExitCode -ne 0) {
        throw 'The private staged archive could not be downloaded for verification. Do not approve it in the browser.'
    }
    $downloadedArchives = @(Get-ChildItem -LiteralPath $DownloadRoot -Filter '*.tgz' -File)
    if ($downloadedArchives.Count -ne 1) {
        throw 'The staged archive download did not produce exactly one package file.'
    }
    $downloadedArchive = $downloadedArchives[0]
    $downloadedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $downloadedArchive.FullName).Hash.ToLowerInvariant()
    if ($downloadedHash -ne $ExpectedArchiveSha256) {
        throw 'The downloaded staged archive does not match the approved SHA-256. Do not approve it in the browser.'
    }

    & $SmokeInvoker $downloadedArchive.FullName

    $recordDirectory = Split-Path -Parent $StageRecordPath
    $null = New-Item -ItemType Directory -Path $recordDirectory -Force
    [System.IO.File]::WriteAllText(
        $StageRecordPath,
        (($StageRecord | ConvertTo-Json) + "`n"),
        [System.Text.UTF8Encoding]::new($false)
    )
    return $downloadedArchive
}

function Invoke-StagedVerificationSelfTest {
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "supericons-staged-verification-$([guid]::NewGuid().ToString('N'))"
    $expectedBytes = [System.Text.UTF8Encoding]::new($false).GetBytes('approved archive')
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $expectedHash = ([System.BitConverter]::ToString($sha.ComputeHash($expectedBytes))).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
    $record = [pscustomobject]@{
        schema_version = 1
        manifest_sha256 = 'a' * 64
        package = '@supericons/mcp@0.4.19-beta.1'
        tag = 'beta'
        stage_id = '11111111-1111-4111-8111-111111111111'
        archive_sha256 = $expectedHash
        downloaded_archive_sha256_verified = $true
        installed_smoke_verified = $true
    }
    try {
        $downloadFailureRoot = Join-Path $temporaryRoot 'download-failure'
        $null = New-Item -ItemType Directory -Path $downloadFailureRoot -Force
        $downloadFailureRecord = Join-Path $downloadFailureRoot 'record.json'
        $downloadFailureRejected = $false
        try {
            $null = Complete-StagedArchiveVerification `
                ([pscustomobject]@{ ExitCode = 1; Output = 'mock download failure' }) `
                $downloadFailureRoot `
                $expectedHash `
                { param([string]$ArchivePath) } `
                $downloadFailureRecord `
                $record
        }
        catch {
            $downloadFailureRejected = $_.Exception.Message -match 'could not be downloaded'
        }

        $hashFailureRoot = Join-Path $temporaryRoot 'hash-failure'
        $null = New-Item -ItemType Directory -Path $hashFailureRoot -Force
        [System.IO.File]::WriteAllText(
            (Join-Path $hashFailureRoot 'package.tgz'),
            'wrong archive',
            [System.Text.UTF8Encoding]::new($false)
        )
        $hashFailureRecord = Join-Path $hashFailureRoot 'record.json'
        $hashFailureRejected = $false
        try {
            $null = Complete-StagedArchiveVerification `
                ([pscustomobject]@{ ExitCode = 0; Output = 'ok' }) `
                $hashFailureRoot `
                $expectedHash `
                { param([string]$ArchivePath) } `
                $hashFailureRecord `
                $record
        }
        catch {
            $hashFailureRejected = $_.Exception.Message -match 'does not match the approved SHA-256'
        }

        $smokeFailureRoot = Join-Path $temporaryRoot 'smoke-failure'
        $null = New-Item -ItemType Directory -Path $smokeFailureRoot -Force
        [System.IO.File]::WriteAllBytes(
            (Join-Path $smokeFailureRoot 'package.tgz'),
            $expectedBytes
        )
        $smokeFailureRecord = Join-Path $smokeFailureRoot 'record.json'
        $smokeFailureRejected = $false
        try {
            $null = Complete-StagedArchiveVerification `
                ([pscustomobject]@{ ExitCode = 0; Output = 'ok' }) `
                $smokeFailureRoot `
                $expectedHash `
                { param([string]$ArchivePath) throw 'mock installed smoke failure' } `
                $smokeFailureRecord `
                $record
        }
        catch {
            $smokeFailureRejected = $_.Exception.Message -match 'mock installed smoke failure'
        }

        $successRoot = Join-Path $temporaryRoot 'success'
        $null = New-Item -ItemType Directory -Path $successRoot -Force
        [System.IO.File]::WriteAllBytes(
            (Join-Path $successRoot 'package.tgz'),
            $expectedBytes
        )
        $successRecord = Join-Path $successRoot 'record.json'
        $smokeCalls = [pscustomobject]@{ Count = 0 }
        $null = Complete-StagedArchiveVerification `
            ([pscustomobject]@{ ExitCode = 0; Output = 'ok' }) `
            $successRoot `
            $expectedHash `
            { param([string]$ArchivePath) $smokeCalls.Count += 1 }.GetNewClosure() `
            $successRecord `
            $record

        if (
            -not $downloadFailureRejected -or
            -not $hashFailureRejected -or
            -not $smokeFailureRejected -or
            (Test-Path -LiteralPath $downloadFailureRecord) -or
            (Test-Path -LiteralPath $hashFailureRecord) -or
            (Test-Path -LiteralPath $smokeFailureRecord) -or
            -not (Test-Path -LiteralPath $successRecord) -or
            $smokeCalls.Count -ne 1
        ) {
            throw 'Staged-verification self-test did not enforce fail-closed download, hash, and smoke behavior.'
        }

        return [pscustomobject]@{
            status = 'ok'
            download_failure_rejected = $true
            hash_mismatch_rejected = $true
            smoke_failure_rejected = $true
            failed_paths_wrote_stage_records = 0
            successful_path_wrote_stage_record = $true
        }
    }
    finally {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ($RunStageAttemptSelfTest) {
    if ($ExecuteApprovedStaging -or $RunStagedVerificationSelfTest) {
        throw 'Stage-attempt self-test cannot run with another mode.'
    }
    Write-Output (Invoke-StageAttemptSelfTest | ConvertTo-Json -Depth 4)
    exit 0
}
if ($RunStagedVerificationSelfTest) {
    if ($ExecuteApprovedStaging) {
        throw 'Staged-verification self-test cannot run with real staging.'
    }
    Write-Output (Invoke-StagedVerificationSelfTest | ConvertTo-Json -Depth 4)
    exit 0
}

if (-not $ExecuteApprovedStaging) {
    throw 'Staging is disabled. Pass -ExecuteApprovedStaging only for a bounded, independently audited release.'
}
if ($ApprovedManifestSha256 -notmatch '^[a-fA-F0-9]{64}$') {
    throw 'A valid approved manifest SHA-256 is required.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repoRoot 'docs\si-v2\search\reviews\search-v2-beta1-publication-authorization-manifest-2026-07-17.json'
$actualManifestSha256 = Get-NormalizedTextSha256 $manifestPath
if ($actualManifestSha256 -ne $ApprovedManifestSha256.ToLowerInvariant()) {
    throw 'The current manifest does not match the audited release fingerprint.'
}
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if ($manifest.publication_flow.mode -ne 'npm_staged_browser_security_key') {
    throw 'The manifest does not authorize npm staged publishing.'
}
if ($manifest.publication_attempts.maximum_additional_stage_commands -ne 1) {
    throw 'This runner supports exactly one manifest-bound staging command.'
}

$stagerPath = Join-Path $repoRoot $manifest.artifacts.stager
if ((Get-NormalizedTextSha256 $stagerPath) -ne $manifest.artifacts.stager_sha256) {
    throw 'The guarded staging runner changed after the manifest was prepared.'
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
& node $packetVerifierPath --expected-manifest $actualManifestSha256
if ($LASTEXITCODE -ne 0) {
    throw 'The publication packet verifier failed.'
}

$npmExecutable = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if ([string]::IsNullOrWhiteSpace($npmExecutable)) {
    $npmExecutable = (Get-Command npm -ErrorAction Stop).Source
}
$npxExecutable = (Get-Command npx.cmd -ErrorAction SilentlyContinue).Source
if ([string]::IsNullOrWhiteSpace($npxExecutable)) {
    $npxExecutable = (Get-Command npx -ErrorAction Stop).Source
}
$npmUser = Invoke-NativeCommandResult $npmExecutable @('whoami')
if ($npmUser.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($npmUser.Output)) {
    throw 'npm authentication is required. Run npm login directly in this terminal.'
}
$distTags = Convert-CommandJson `
    (Invoke-NativeCommandResult $npmExecutable @('view', $manifest.package.name, 'dist-tags', '--json')) `
    'npm preflight tag verification'
if ($distTags.latest -ne $manifest.package.latest_must_remain) {
    throw 'npm latest changed from the approved preflight value.'
}
$packageSpec = "$($manifest.package.name)@$($manifest.package.version)"
$versionProbe = Invoke-NativeCommandResult $npmExecutable @('view', $packageSpec, 'version', '--json')
if ($versionProbe.ExitCode -eq 0) {
    throw 'The approved prerelease version already exists. Refusing to stage over it.'
}
if ($versionProbe.Output -notmatch 'E404|No match found') {
    throw 'The prerelease absence check failed for a reason other than version not found.'
}

$stageList = @(Convert-CommandJson `
    (Invoke-NativeCommandResult $npxExecutable @('--yes', "npm@$NpmStageCliVersion", 'stage', 'list', $manifest.package.name, '--json')) `
    'npm staged-package preflight')
$existingStage = @($stageList | Where-Object {
    $_.packageName -eq $manifest.package.name -and $_.version -eq $manifest.package.version
})
if ($existingStage.Count -ne 0) {
    throw 'The approved prerelease already has a staged package. Refusing to create another.'
}

$receiptPath = Get-StageAttemptReceiptPath $actualManifestSha256
$stageInvoker = {
    param([string[]]$StageArguments)
    return Invoke-NativeCommandResult $npxExecutable $StageArguments
}
$stageResult = Invoke-BoundedStagePublish `
    $stageInvoker `
    @(
        '--yes',
        "npm@$NpmStageCliVersion",
        'stage',
        'publish',
        $archivePath,
        '--tag',
        $manifest.package.publish_tag,
        '--access',
        'public',
        '--ignore-scripts',
        '--json'
    ) `
    $receiptPath `
    $actualManifestSha256 `
    $packageSpec `
    $true
if ($stageResult.ExitCode -ne 0) {
    throw 'npm staged publishing failed. The manifest allowance is consumed. Reconcile staged-package state before any further command.'
}
$stageJson = Convert-CommandJson $stageResult 'npm staged publication'
$packageResult = $stageJson.PSObject.Properties[$manifest.package.name].Value
if ($null -eq $packageResult) {
    throw 'npm staged publication did not return the expected package record.'
}
if (
    $packageResult.name -ne $manifest.package.name -or
    $packageResult.version -ne $manifest.package.version -or
    $packageResult.shasum -ne $manifest.package.npm_shasum -or
    $packageResult.integrity -ne $manifest.package.npm_integrity -or
    $packageResult.size -ne $manifest.package.archive_size_bytes -or
    $packageResult.stageId -notmatch '^[0-9a-fA-F-]{36}$'
) {
    throw 'npm staged publication metadata does not match the approved archive.'
}
$stageId = [string]$packageResult.stageId

$stageView = Convert-CommandJson `
    (Invoke-NativeCommandResult $npxExecutable @('--yes', "npm@$NpmStageCliVersion", 'stage', 'view', $stageId, '--json')) `
    'npm staged-package verification'
if (
    $stageView.id -ne $stageId -or
    $stageView.packageName -ne $manifest.package.name -or
    $stageView.version -ne $manifest.package.version -or
    $stageView.tag -ne $manifest.package.publish_tag -or
    $stageView.shasum -ne $manifest.package.npm_shasum
) {
    throw 'The private staged-package record does not match the approved release.'
}

$downloadRoot = Join-Path $repoRoot "tmp\search-v2-staged-beta-$($actualManifestSha256.Substring(0, 12))"
$null = New-Item -ItemType Directory -Path $downloadRoot -Force
Get-ChildItem -LiteralPath $downloadRoot -Filter '*.tgz' -File -ErrorAction SilentlyContinue | Remove-Item -Force
$downloadResult = Invoke-NativeCommandResult `
    $npxExecutable `
    @('--yes', "npm@$NpmStageCliVersion", 'stage', 'download', $stageId, '--json') `
    $downloadRoot
if ($downloadResult.ExitCode -ne 0) {
    throw 'The private staged archive could not be downloaded for verification. Do not approve it in the browser.'
}
$smokePath = Join-Path $repoRoot $manifest.artifacts.published_smoke
$localStateRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
$stageRecordRoot = Join-Path $localStateRoot 'Supericons\staged-releases'
$stageRecordPath = Join-Path $stageRecordRoot "$actualManifestSha256.json"
$stageRecord = [pscustomobject]@{
    schema_version = 1
    manifest_sha256 = $actualManifestSha256
    package = $packageSpec
    tag = $manifest.package.publish_tag
    stage_id = $stageId
    archive_sha256 = $manifest.package.archive_sha256
    downloaded_archive_sha256_verified = $true
    installed_smoke_verified = $true
    staged_at_utc = [DateTime]::UtcNow.ToString('o')
}
$smokeInvoker = {
    param([string]$ArchivePath)
    & node $smokePath `
        --package-spec $ArchivePath `
        --expected-version $manifest.package.version `
        --expected-route-fingerprint $manifest.search_contract.stdio_route_fingerprint
    if ($LASTEXITCODE -ne 0) {
        throw 'The downloaded staged archive failed the installed-package smoke. Do not approve it in the browser.'
    }
}.GetNewClosure()
$downloadedArchive = Complete-StagedArchiveVerification `
    $downloadResult `
    $downloadRoot `
    $manifest.package.archive_sha256 `
    $smokeInvoker `
    $stageRecordPath `
    $stageRecord

Write-Output ([pscustomobject]@{
    status = 'staged_and_verified'
    package = $packageSpec
    tag = $manifest.package.publish_tag
    stage_id = $stageId
    archive_sha256 = $manifest.package.archive_sha256
    downloaded_archive_verified = $true
    installed_smoke_verified = $true
    next_access_step = 'Open npmjs.com Staged Packages and approve this exact stage with the account security key.'
} | ConvertTo-Json -Depth 4)
