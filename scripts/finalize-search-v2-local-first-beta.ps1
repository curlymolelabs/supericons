param(
    [switch]$ExecuteApprovedFinalization,
    [string]$ApprovedManifestSha256,
    [switch]$RunRollbackSelfTest,
    [ValidateSet('integrity_mismatch', 'tag_mismatch', 'smoke_failure', 'already_deprecated')]
    [string]$RollbackTestScenario,
    [switch]$RunStageRecordSelfTest,
    [switch]$RunFinalizationOutcomeSelfTest
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

function Get-StagedReleaseRecordPath([string]$ManifestSha256) {
    $localStateRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if ([string]::IsNullOrWhiteSpace($localStateRoot)) {
        throw 'Local application data is unavailable, so the verified stage record cannot be read.'
    }
    return Join-Path `
        (Join-Path $localStateRoot 'Supericons\staged-releases') `
        "$ManifestSha256.json"
}

function Get-FinalizationOutcomePath([string]$ManifestSha256) {
    $localStateRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if ([string]::IsNullOrWhiteSpace($localStateRoot)) {
        throw 'Local application data is unavailable, so finalization replay cannot be protected.'
    }
    return Join-Path `
        (Join-Path $localStateRoot 'Supericons\release-finalization-outcomes') `
        "$ManifestSha256.json"
}

function New-FinalizationReservation(
    [string]$Path,
    [string]$ManifestSha256,
    [string]$PackageSpec,
    [string]$StageId
) {
    $directory = Split-Path -Parent $Path
    $null = New-Item -ItemType Directory -Path $directory -Force
    $payload = [pscustomobject]@{
        schema_version = 1
        manifest_sha256 = $ManifestSha256
        package = $PackageSpec
        stage_id = $StageId
        action = 'postapproval_finalization'
        status = 'in_progress'
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
            $existing = $null
            try {
                $existing = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
            }
            catch {
                throw 'A prior finalization record exists but cannot be read. Refusing replay.'
            }
            throw "Finalization is already terminal or reserved with status $($existing.status). Refusing replay."
        }
        throw "Finalization could not be reserved safely. $($_.Exception.Message)"
    }
    finally {
        if ($null -ne $stream) {
            $stream.Dispose()
        }
    }
}

function Complete-FinalizationOutcome(
    [string]$Path,
    [string]$ManifestSha256,
    [string]$PackageSpec,
    [string]$StageId,
    [ValidateSet('published_and_verified', 'rolled_back')]
    [string]$Status,
    [string]$Reason
) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw 'The finalization reservation is missing.'
    }
    $existing = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
    if (
        $existing.schema_version -ne 1 -or
        $existing.manifest_sha256 -ne $ManifestSha256 -or
        $existing.package -ne $PackageSpec -or
        $existing.stage_id -ne $StageId -or
        $existing.status -ne 'in_progress'
    ) {
        throw 'The finalization reservation does not match the active release.'
    }
    $payload = [pscustomobject]@{
        schema_version = 1
        manifest_sha256 = $ManifestSha256
        package = $PackageSpec
        stage_id = $StageId
        action = 'postapproval_finalization'
        status = $Status
        reason = $Reason
        reserved_at_utc = $existing.reserved_at_utc
        completed_at_utc = [DateTime]::UtcNow.ToString('o')
    } | ConvertTo-Json -Compress
    $temporaryPath = "$Path.$([guid]::NewGuid().ToString('N')).tmp"
    $backupPath = "$Path.$([guid]::NewGuid().ToString('N')).bak"
    try {
        [System.IO.File]::WriteAllText(
            $temporaryPath,
            $payload,
            [System.Text.UTF8Encoding]::new($false)
        )
        [System.IO.File]::Replace($temporaryPath, $Path, $backupPath)
    }
    finally {
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
    }
}

function Assert-VerifiedStageRecord(
    [string]$Path,
    [object]$Manifest,
    [string]$ManifestSha256,
    [string]$PackageSpec
) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw 'The verified private stage record is missing. Browser-approved publication cannot be finalized.'
    }
    try {
        $record = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
    }
    catch {
        throw 'The verified private stage record is invalid JSON.'
    }
    if (
        $record.schema_version -ne 1 -or
        $record.manifest_sha256 -ne $ManifestSha256 -or
        $record.package -ne $PackageSpec -or
        $record.tag -ne $Manifest.package.publish_tag -or
        $record.stage_id -notmatch '^[0-9a-fA-F-]{36}$' -or
        $record.archive_sha256 -ne $Manifest.package.archive_sha256 -or
        $record.downloaded_archive_sha256_verified -ne $true -or
        $record.installed_smoke_verified -ne $true
    ) {
        throw 'The verified private stage record does not match the approved release.'
    }
    return $record
}

function Test-PostApprovalRegistryState(
    [scriptblock]$ReadInvoker,
    [object]$Manifest,
    [string]$PackageSpec
) {
    $existingDeprecation = Convert-NpmJson `
        (& $ReadInvoker @('view', $PackageSpec, 'deprecated', '--json')) `
        'Existing exact prerelease deprecation check'
    if (-not [string]::IsNullOrWhiteSpace([string]$existingDeprecation)) {
        throw 'Exact prerelease is already deprecated.'
    }

    $publishedDist = Convert-NpmJson `
        (& $ReadInvoker @('view', $PackageSpec, 'dist', '--json')) `
        'Published npm dist verification'
    if ($publishedDist.shasum -ne $Manifest.package.npm_shasum) {
        throw 'The published npm shasum does not match the approved archive.'
    }
    if ($publishedDist.integrity -ne $Manifest.package.npm_integrity) {
        throw 'The published npm integrity does not match the approved archive.'
    }

    $postPublishTags = Convert-NpmJson `
        (& $ReadInvoker @('view', $Manifest.package.name, 'dist-tags', '--json')) `
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
    [scriptblock]$ReadInvoker,
    [scriptblock]$DeprecateInvoker,
    [object]$Manifest,
    [string]$PackageSpec
) {
    $deprecationMessage = 'Beta-verification-failed-do-not-install'
    $deprecateResult = & $DeprecateInvoker @('deprecate', $PackageSpec, $deprecationMessage)
    if ($null -eq $deprecateResult -or $deprecateResult.ExitCode -ne 0) {
        throw 'Exact prerelease deprecation failed. Owner browser security-key access may be required.'
    }

    $recordedDeprecation = Convert-NpmJson `
        (& $ReadInvoker @('view', $PackageSpec, 'deprecated', '--json')) `
        'Exact prerelease deprecation verification'
    if ([string]::IsNullOrWhiteSpace([string]$recordedDeprecation)) {
        throw 'Exact prerelease deprecation could not be confirmed.'
    }

    $finalTags = Convert-NpmJson `
        (& $ReadInvoker @('view', $Manifest.package.name, 'dist-tags', '--json')) `
        'Post-deprecation npm tag verification'
    if ($finalTags.latest -ne $Manifest.package.latest_must_remain) {
        throw 'npm latest changed during rollback.'
    }

    return [pscustomobject]@{
        deprecated = $true
        exact_package = $PackageSpec
        latest_tag = $finalTags.latest
    }
}

function Invoke-PostApprovalValidation(
    [scriptblock]$ReadInvoker,
    [scriptblock]$DeprecateInvoker,
    [object]$Manifest,
    [string]$PackageSpec,
    [scriptblock]$SmokeVerifier
) {
    try {
        $registryState = Test-PostApprovalRegistryState $ReadInvoker $Manifest $PackageSpec
        & $SmokeVerifier
        return $registryState
    }
    catch {
        $verificationFailure = $_.Exception.Message
        if ($verificationFailure -eq 'Exact prerelease is already deprecated.') {
            throw $verificationFailure
        }
        try {
            $null = Invoke-ExactPrereleaseRollback `
                $ReadInvoker $DeprecateInvoker $Manifest $PackageSpec
        }
        catch {
            throw "Post-publication verification failed: $verificationFailure Exact prerelease deprecation could not be confirmed. $($_.Exception.Message)"
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
            version = '0.4.19-beta.1'
            npm_shasum = 'approved-shasum'
            npm_integrity = 'approved-integrity'
            latest_must_remain = '0.4.17'
        }
    }
    $packageSpec = '@supericons/mcp@0.4.19-beta.1'
    $events = [System.Collections.Generic.List[string]]::new()
    $tagReadCount = [pscustomobject]@{ Count = 0 }
    $deprecationReadCount = [pscustomobject]@{ Count = 0 }
    $comparisonCount = [pscustomobject]@{ Count = 0 }
    $readInvoker = {
        param([string[]]$NpmArguments)
        $events.Add($NpmArguments -join ' ')
        if ($NpmArguments[0] -eq 'view' -and $NpmArguments[1] -eq $packageSpec -and $NpmArguments[2] -eq 'dist') {
            $integrity = if ($Scenario -eq 'integrity_mismatch') { 'wrong-integrity' } else { 'approved-integrity' }
            return [pscustomobject]@{
                ExitCode = 0
                Output = (@{ shasum = 'approved-shasum'; integrity = $integrity } | ConvertTo-Json -Compress)
            }
        }
        if ($NpmArguments[0] -eq 'view' -and $NpmArguments[1] -eq '@supericons/mcp' -and $NpmArguments[2] -eq 'dist-tags') {
            $tagReadCount.Count += 1
            $beta = if ($Scenario -eq 'tag_mismatch' -and $tagReadCount.Count -eq 1) {
                '0.4.18-beta.0'
            }
            else {
                '0.4.19-beta.1'
            }
            return [pscustomobject]@{
                ExitCode = 0
                Output = (@{ latest = '0.4.17'; beta = $beta } | ConvertTo-Json -Compress)
            }
        }
        if ($NpmArguments[0] -eq 'view' -and $NpmArguments[1] -eq $packageSpec -and $NpmArguments[2] -eq 'deprecated') {
            $deprecationReadCount.Count += 1
            $deprecation = if ($Scenario -eq 'already_deprecated' -or $deprecationReadCount.Count -gt 1) {
                'Beta-verification-failed-do-not-install'
            }
            else {
                $null
            }
            return [pscustomobject]@{
                ExitCode = 0
                Output = ($deprecation | ConvertTo-Json -Compress)
            }
        }
        return [pscustomobject]@{ ExitCode = 1; Output = 'unsupported read command' }
    }.GetNewClosure()
    $deprecateInvoker = {
        param([string[]]$NpmArguments)
        $events.Add($NpmArguments -join ' ')
        return [pscustomobject]@{ ExitCode = 0; Output = 'deprecated' }
    }.GetNewClosure()
    $smokeVerifier = {
        if ($Scenario -eq 'smoke_failure') {
            throw 'Installed-package smoke failed.'
        }
    }.GetNewClosure()

    $verificationFailure = $null
    try {
        $null = Invoke-PostApprovalValidation `
            $readInvoker $deprecateInvoker $manifest $packageSpec $smokeVerifier
        $comparisonCount.Count += 1
    }
    catch {
        $verificationFailure = $_.Exception.Message
    }
    if ([string]::IsNullOrWhiteSpace($verificationFailure)) {
        throw 'Rollback self-test did not produce the required verification failure.'
    }
    $deprecationCount = @($events | Where-Object { $_ -match '^deprecate ' }).Count
    $latestMutationCount = @($events | Where-Object { $_ -match '^dist-tag ' }).Count
    $publishCount = @($events | Where-Object { $_ -match '^publish |^stage publish ' }).Count
    $expectedDeprecationCount = if ($Scenario -eq 'already_deprecated') { 0 } else { 1 }
    if ($deprecationCount -ne $expectedDeprecationCount -or $latestMutationCount -ne 0 -or $publishCount -ne 0) {
        throw 'Rollback self-test command counts do not match the safety contract.'
    }
    return [pscustomobject]@{
        status = 'ok'
        scenario = $Scenario
        verification_failure = $verificationFailure
        publish_calls = $publishCount
        deprecation_calls = $deprecationCount
        latest_mutation_calls = $latestMutationCount
        comparison_calls = $comparisonCount.Count
    }
}

function Invoke-StageRecordSelfTest {
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "supericons-stage-record-$([guid]::NewGuid().ToString('N'))"
    $recordPath = Join-Path $temporaryRoot 'record.json'
    $manifestSha256 = 'a' * 64
    $packageSpec = '@supericons/mcp@0.4.19-beta.1'
    $manifest = [pscustomobject]@{
        package = [pscustomobject]@{
            publish_tag = 'beta'
            archive_sha256 = 'b' * 64
        }
    }
    try {
        $null = New-Item -ItemType Directory -Path $temporaryRoot -Force
        $missingRejected = $false
        try {
            $null = Assert-VerifiedStageRecord $recordPath $manifest $manifestSha256 $packageSpec
        }
        catch {
            $missingRejected = $_.Exception.Message -match 'record is missing'
        }
        [pscustomobject]@{
            schema_version = 1
            manifest_sha256 = $manifestSha256
            package = $packageSpec
            tag = 'beta'
            stage_id = '11111111-1111-4111-8111-111111111111'
            archive_sha256 = 'b' * 64
            downloaded_archive_sha256_verified = $true
            installed_smoke_verified = $true
        } | ConvertTo-Json | Set-Content -LiteralPath $recordPath -Encoding utf8
        $record = Assert-VerifiedStageRecord $recordPath $manifest $manifestSha256 $packageSpec
        $wrongManifestRejected = $false
        try {
            $null = Assert-VerifiedStageRecord $recordPath $manifest ('c' * 64) $packageSpec
        }
        catch {
            $wrongManifestRejected = $_.Exception.Message -match 'does not match'
        }
        if (-not $missingRejected -or $record.stage_id -notmatch '^[0-9a-fA-F-]{36}$' -or -not $wrongManifestRejected) {
            throw 'Verified-stage-record self-test did not enforce its contract.'
        }
        return [pscustomobject]@{
            status = 'ok'
            missing_record_rejected = $true
            valid_record_accepted = $true
            wrong_manifest_rejected = $true
        }
    }
    finally {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-FinalizationOutcomeSelfTest {
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "supericons-finalization-outcome-$([guid]::NewGuid().ToString('N'))"
    $manifestSha256 = 'a' * 64
    $packageSpec = '@supericons/mcp@0.4.19-beta.1'
    $stageId = '11111111-1111-4111-8111-111111111111'
    $rolledBackPath = Join-Path $temporaryRoot 'rolled-back.json'
    $verifiedPath = Join-Path $temporaryRoot 'verified.json'
    $inProgressPath = Join-Path $temporaryRoot 'in-progress.json'
    $externalRequests = [pscustomobject]@{ Count = 0 }
    try {
        New-FinalizationReservation $rolledBackPath $manifestSha256 $packageSpec $stageId
        $externalRequests.Count += 1
        Complete-FinalizationOutcome `
            $rolledBackPath $manifestSha256 $packageSpec $stageId 'rolled_back' 'test rollback'
        $beforeRollbackReplay = $externalRequests.Count
        $rollbackReplayRejected = $false
        try {
            New-FinalizationReservation $rolledBackPath $manifestSha256 $packageSpec $stageId
            $externalRequests.Count += 1
        }
        catch {
            $rollbackReplayRejected = $_.Exception.Message -match 'status rolled_back'
        }
        $rollbackReplayExternalRequests = $externalRequests.Count - $beforeRollbackReplay

        New-FinalizationReservation $verifiedPath $manifestSha256 $packageSpec $stageId
        $externalRequests.Count += 1
        Complete-FinalizationOutcome `
            $verifiedPath $manifestSha256 $packageSpec $stageId 'published_and_verified' 'test success'
        $beforeSuccessReplay = $externalRequests.Count
        $successReplayRejected = $false
        try {
            New-FinalizationReservation $verifiedPath $manifestSha256 $packageSpec $stageId
            $externalRequests.Count += 1
        }
        catch {
            $successReplayRejected = $_.Exception.Message -match 'status published_and_verified'
        }
        $successReplayExternalRequests = $externalRequests.Count - $beforeSuccessReplay

        New-FinalizationReservation $inProgressPath $manifestSha256 $packageSpec $stageId
        $externalRequests.Count += 1
        $beforeInProgressReplay = $externalRequests.Count
        $inProgressReplayRejected = $false
        try {
            New-FinalizationReservation $inProgressPath $manifestSha256 $packageSpec $stageId
            $externalRequests.Count += 1
        }
        catch {
            $inProgressReplayRejected = $_.Exception.Message -match 'status in_progress'
        }
        $inProgressReplayExternalRequests = $externalRequests.Count - $beforeInProgressReplay

        $rolledBackText = Get-Content -Raw -LiteralPath $rolledBackPath
        $verifiedText = Get-Content -Raw -LiteralPath $verifiedPath
        $inProgressText = Get-Content -Raw -LiteralPath $inProgressPath
        $rolledBack = $rolledBackText | ConvertFrom-Json
        $verified = $verifiedText | ConvertFrom-Json
        $inProgress = $inProgressText | ConvertFrom-Json
        $records = @($rolledBack, $verified, $inProgress)
        $recordBindingMismatch = @($records | Where-Object {
            $_.schema_version -ne 1 -or
            $_.manifest_sha256 -ne $manifestSha256 -or
            $_.package -ne $packageSpec -or
            $_.stage_id -ne $stageId -or
            $_.action -ne 'postapproval_finalization'
        }).Count -ne 0
        if (
            -not $rollbackReplayRejected -or
            -not $successReplayRejected -or
            -not $inProgressReplayRejected -or
            $rollbackReplayExternalRequests -ne 0 -or
            $successReplayExternalRequests -ne 0 -or
            $inProgressReplayExternalRequests -ne 0 -or
            $recordBindingMismatch -or
            $rolledBack.status -ne 'rolled_back' -or
            $verified.status -ne 'published_and_verified' -or
            $inProgress.status -ne 'in_progress' -or
            "$rolledBackText`n$verifiedText`n$inProgressText" -match 'password|credential|token|secret'
        ) {
            throw 'Finalization-outcome self-test did not enforce terminal replay protection.'
        }
        return [pscustomobject]@{
            status = 'ok'
            rolled_back_replay_external_requests = $rollbackReplayExternalRequests
            verified_replay_external_requests = $successReplayExternalRequests
            in_progress_replay_external_requests = $inProgressReplayExternalRequests
            terminal_records_manifest_bound = $true
            terminal_records_credential_free = $true
        }
    }
    finally {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ($RunRollbackSelfTest) {
    if ($ExecuteApprovedFinalization -or $RunStageRecordSelfTest -or $RunFinalizationOutcomeSelfTest) {
        throw 'Rollback self-test cannot run with another mode.'
    }
    Write-Output (Invoke-RollbackSelfTest $RollbackTestScenario | ConvertTo-Json -Depth 4)
    exit 0
}
if ($RunStageRecordSelfTest) {
    if ($ExecuteApprovedFinalization -or $RunFinalizationOutcomeSelfTest) {
        throw 'Stage-record self-test cannot run with real finalization.'
    }
    Write-Output (Invoke-StageRecordSelfTest | ConvertTo-Json -Depth 4)
    exit 0
}
if ($RunFinalizationOutcomeSelfTest) {
    if ($ExecuteApprovedFinalization) {
        throw 'Finalization-outcome self-test cannot run with real finalization.'
    }
    Write-Output (Invoke-FinalizationOutcomeSelfTest | ConvertTo-Json -Depth 4)
    exit 0
}
if (-not $ExecuteApprovedFinalization) {
    throw 'Finalization is disabled. Pass -ExecuteApprovedFinalization only after browser approval of the verified stage.'
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
    throw 'The manifest does not authorize browser-approved staged publication.'
}
$finalizerPath = Join-Path $repoRoot $manifest.artifacts.postapproval_finalizer
if ((Get-NormalizedTextSha256 $finalizerPath) -ne $manifest.artifacts.postapproval_finalizer_sha256) {
    throw 'The post-approval finalizer changed after the manifest was prepared.'
}
$packetVerifierPath = Join-Path $repoRoot $manifest.artifacts.packet_verifier
if ((Get-NormalizedTextSha256 $packetVerifierPath) -ne $manifest.artifacts.packet_verifier_sha256) {
    throw 'The packet verifier changed after the manifest was prepared.'
}

$packageSpec = "$($manifest.package.name)@$($manifest.package.version)"
$stageRecordPath = Get-StagedReleaseRecordPath $actualManifestSha256
$stageRecord = Assert-VerifiedStageRecord `
    $stageRecordPath $manifest $actualManifestSha256 $packageSpec
$finalizationOutcomePath = Get-FinalizationOutcomePath $actualManifestSha256
New-FinalizationReservation `
    $finalizationOutcomePath $actualManifestSha256 $packageSpec $stageRecord.stage_id

& node $packetVerifierPath --expected-manifest $actualManifestSha256
if ($LASTEXITCODE -ne 0) {
    throw 'The publication packet verifier failed.'
}

$npmExecutable = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if ([string]::IsNullOrWhiteSpace($npmExecutable)) {
    $npmExecutable = (Get-Command npm -ErrorAction Stop).Source
}
$readInvoker = {
    param([string[]]$NpmArguments)
    return Invoke-NativeCommandResult $npmExecutable $NpmArguments
}
$deprecateInvoker = {
    param([string[]]$NpmArguments)
    $process = Start-Process `
        -FilePath $npmExecutable `
        -ArgumentList $NpmArguments `
        -NoNewWindow `
        -Wait `
        -PassThru
    return [pscustomobject]@{
        ExitCode = $process.ExitCode
        Output = 'Interactive deprecation command completed.'
    }
}
$npmUser = & $readInvoker @('whoami')
if ($npmUser.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($npmUser.Output)) {
    throw 'npm authentication is required. Run npm login directly in this terminal.'
}
$smokeVerifier = {
    $smokePath = Join-Path $repoRoot $manifest.artifacts.published_smoke
    & node $smokePath `
        --package-spec $packageSpec `
        --expected-version $manifest.package.version `
        --expected-route-fingerprint $manifest.search_contract.stdio_route_fingerprint
    if ($LASTEXITCODE -ne 0) {
        throw 'The public registry package failed the installed-package smoke.'
    }
}
try {
    $registryState = Invoke-PostApprovalValidation `
        $readInvoker $deprecateInvoker $manifest $packageSpec $smokeVerifier
}
catch {
    $failure = $_.Exception.Message
    if (
        $failure -match 'Exact prerelease is already deprecated' -or
        $failure -match 'The exact prerelease was deprecated and npm latest was left unchanged'
    ) {
        Complete-FinalizationOutcome `
            $finalizationOutcomePath `
            $actualManifestSha256 `
            $packageSpec `
            $stageRecord.stage_id `
            'rolled_back' `
            $failure
    }
    throw
}
Complete-FinalizationOutcome `
    $finalizationOutcomePath `
    $actualManifestSha256 `
    $packageSpec `
    $stageRecord.stage_id `
    'published_and_verified' `
    'Public registry identity, tags, and installed-package smoke passed.'

Write-Output ([pscustomobject]@{
    status = 'published_and_verified'
    package = $packageSpec
    stage_id = $stageRecord.stage_id
    shasum = $registryState.published_dist.shasum
    integrity = $registryState.published_dist.integrity
    beta_tag = $registryState.dist_tags.beta
    latest_tag = $registryState.dist_tags.latest
    installed_smoke_verified = $true
    hosted_comparison_requests = 0
} | ConvertTo-Json -Depth 4)
