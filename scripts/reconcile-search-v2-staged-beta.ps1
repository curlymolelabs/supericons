param(
    [switch]$ExecuteApprovedReconciliation,
    [string]$ApprovedManifestSha256,
    [switch]$RunReconciliationSelfTest
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

function Get-LocalStatePath([string]$DirectoryName, [string]$Name) {
    $localStateRoot = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
    if ([string]::IsNullOrWhiteSpace($localStateRoot)) {
        throw 'Local application data is unavailable.'
    }
    return Join-Path (Join-Path $localStateRoot "Supericons\$DirectoryName") $Name
}

function Assert-SourceStageAttemptReceipt(
    [string]$Path,
    [string]$SourceManifestSha256,
    [string]$PackageSpec
) {
    if (-not (Test-Path -LiteralPath $Path)) {
        throw 'The source staging-attempt receipt is missing.'
    }
    try {
        $receipt = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
    }
    catch {
        throw 'The source staging-attempt receipt is invalid JSON.'
    }
    if (
        $receipt.schema_version -ne 1 -or
        $receipt.manifest_sha256 -ne $SourceManifestSha256 -or
        $receipt.package -ne $PackageSpec -or
        $receipt.action -ne 'npm_stage_publish_reserved'
    ) {
        throw 'The source staging-attempt receipt does not match the reconciled release.'
    }
    return $receipt
}

function Assert-ExistingStageMetadata(
    [object[]]$StageList,
    [object]$StageView,
    [object]$Manifest,
    [string]$StageId
) {
    $matches = @($StageList | Where-Object {
        $_.id -eq $StageId -and
        $_.packageName -eq $Manifest.package.name -and
        $_.version -eq $Manifest.package.version
    })
    if ($matches.Count -ne 1) {
        throw 'The existing private stage is missing or ambiguous.'
    }
    if (
        $StageView.id -ne $StageId -or
        $StageView.packageName -ne $Manifest.package.name -or
        $StageView.version -ne $Manifest.package.version -or
        $StageView.tag -ne $Manifest.package.publish_tag -or
        $StageView.access -ne 'public' -or
        $StageView.shasum -ne $Manifest.package.npm_shasum
    ) {
        throw 'The existing private stage does not match the approved release.'
    }
}

function New-VerifiedStageRecord(
    [string]$Path,
    [object]$Manifest,
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
        tag = $Manifest.package.publish_tag
        stage_id = $StageId
        archive_sha256 = $Manifest.package.archive_sha256
        downloaded_archive_sha256_verified = $true
        installed_smoke_verified = $true
        reconciled_from_manifest_sha256 = $Manifest.reconciliation.source_manifest_sha256
        reconciled_at_utc = [DateTime]::UtcNow.ToString('o')
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
            throw 'The verified stage record for this manifest already exists. Refusing replay.'
        }
        throw "The verified stage record could not be created safely. $($_.Exception.Message)"
    }
    finally {
        if ($null -ne $stream) {
            $stream.Dispose()
        }
    }
}

function Invoke-ReconciliationSelfTest {
    $temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "supericons-stage-reconcile-$([guid]::NewGuid().ToString('N'))"
    $sourceReceiptPath = Join-Path $temporaryRoot 'source-attempt.json'
    $verifiedRecordPath = Join-Path $temporaryRoot 'verified-stage.json'
    $sourceManifestSha256 = 'a' * 64
    $manifestSha256 = 'b' * 64
    $stageId = '11111111-1111-4111-8111-111111111111'
    $packageSpec = '@supericons/mcp@0.4.19-beta.0'
    $manifest = [pscustomobject]@{
        package = [pscustomobject]@{
            name = '@supericons/mcp'
            version = '0.4.19-beta.0'
            publish_tag = 'beta'
            npm_shasum = 'approved-shasum'
            archive_sha256 = 'c' * 64
        }
        reconciliation = [pscustomobject]@{
            source_manifest_sha256 = $sourceManifestSha256
        }
    }
    try {
        $null = New-Item -ItemType Directory -Path $temporaryRoot -Force
        $missingReceiptRejected = $false
        try {
            $null = Assert-SourceStageAttemptReceipt $sourceReceiptPath $sourceManifestSha256 $packageSpec
        }
        catch {
            $missingReceiptRejected = $_.Exception.Message -match 'receipt is missing'
        }

        [pscustomobject]@{
            schema_version = 1
            manifest_sha256 = $sourceManifestSha256
            package = $packageSpec
            action = 'npm_stage_publish_reserved'
        } | ConvertTo-Json | Set-Content -LiteralPath $sourceReceiptPath -Encoding utf8
        $null = Assert-SourceStageAttemptReceipt $sourceReceiptPath $sourceManifestSha256 $packageSpec

        $stageList = @([pscustomobject]@{
            id = $stageId
            packageName = '@supericons/mcp'
            version = '0.4.19-beta.0'
        })
        $stageView = [pscustomobject]@{
            id = $stageId
            packageName = '@supericons/mcp'
            version = '0.4.19-beta.0'
            tag = 'beta'
            access = 'public'
            shasum = 'approved-shasum'
        }
        Assert-ExistingStageMetadata $stageList $stageView $manifest $stageId

        New-VerifiedStageRecord `
            $verifiedRecordPath $manifest $manifestSha256 $packageSpec $stageId
        $secondRecordRejected = $false
        try {
            New-VerifiedStageRecord `
                $verifiedRecordPath $manifest $manifestSha256 $packageSpec $stageId
        }
        catch {
            $secondRecordRejected = $_.Exception.Message -match 'already exists'
        }
        $recordText = Get-Content -Raw -LiteralPath $verifiedRecordPath
        $record = $recordText | ConvertFrom-Json
        if (
            -not $missingReceiptRejected -or
            -not $secondRecordRejected -or
            $record.manifest_sha256 -ne $manifestSha256 -or
            $record.reconciled_from_manifest_sha256 -ne $sourceManifestSha256 -or
            $record.package -ne $packageSpec -or
            $record.stage_id -ne $stageId -or
            $recordText -match 'password|credential|token|secret'
        ) {
            throw 'Stage reconciliation self-test did not enforce the recovery contract.'
        }
        return [pscustomobject]@{
            status = 'ok'
            missing_source_receipt_rejected = $true
            exact_stage_metadata_accepted = $true
            first_verified_record_writes = 1
            second_verified_record_writes = 0
            stage_publish_calls = 0
            verified_record_manifest_bound = $true
            verified_record_contains_credentials = $false
        }
    }
    finally {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if ($RunReconciliationSelfTest) {
    if ($ExecuteApprovedReconciliation) {
        throw 'Reconciliation self-test and real reconciliation cannot run together.'
    }
    Write-Output (Invoke-ReconciliationSelfTest | ConvertTo-Json -Depth 4)
    exit 0
}
if (-not $ExecuteApprovedReconciliation) {
    throw 'Stage reconciliation is disabled. Pass -ExecuteApprovedReconciliation only for the audited existing stage.'
}
if ($ApprovedManifestSha256 -notmatch '^[a-fA-F0-9]{64}$') {
    throw 'A valid approved manifest SHA-256 is required.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $repoRoot 'docs\si-v2\search\reviews\search-v2-local-first-beta-publication-authorization-manifest-2026-07-16.json'
$actualManifestSha256 = Get-NormalizedTextSha256 $manifestPath
if ($actualManifestSha256 -ne $ApprovedManifestSha256.ToLowerInvariant()) {
    throw 'The current manifest does not match the audited reconciliation fingerprint.'
}
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
if (
    $manifest.publication_flow.mode -ne 'npm_staged_browser_security_key' -or
    $manifest.reconciliation.mode -ne 'existing_private_stage_read_only' -or
    $manifest.publication_attempts.maximum_additional_stage_commands -ne 0 -or
    $manifest.external_actions.maximum_private_npm_staged_uploads -ne 0
) {
    throw 'The manifest does not authorize read-only reconciliation of the existing private stage.'
}
$stageId = [string]$manifest.reconciliation.existing_stage_id
if ($stageId -notmatch '^[0-9a-fA-F-]{36}$') {
    throw 'The manifest does not contain a valid existing stage ID.'
}

$reconcilerPath = Join-Path $repoRoot $manifest.artifacts.stage_reconciler
if ((Get-NormalizedTextSha256 $reconcilerPath) -ne $manifest.artifacts.stage_reconciler_sha256) {
    throw 'The stage reconciler changed after the manifest was prepared.'
}
$packetVerifierPath = Join-Path $repoRoot $manifest.artifacts.packet_verifier
if ((Get-NormalizedTextSha256 $packetVerifierPath) -ne $manifest.artifacts.packet_verifier_sha256) {
    throw 'The packet verifier changed after the manifest was prepared.'
}
& node $packetVerifierPath --expected-manifest $actualManifestSha256
if ($LASTEXITCODE -ne 0) {
    throw 'The reconciliation packet verifier failed.'
}

$packageSpec = "$($manifest.package.name)@$($manifest.package.version)"
$sourceReceiptPath = Get-LocalStatePath `
    'release-stage-attempts' `
    "$($manifest.reconciliation.source_manifest_sha256).json"
$null = Assert-SourceStageAttemptReceipt `
    $sourceReceiptPath `
    $manifest.reconciliation.source_manifest_sha256 `
    $packageSpec

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
    'npm reconciliation tag verification'
if ($distTags.latest -ne $manifest.package.latest_must_remain) {
    throw 'npm latest changed from the approved value.'
}
$versionProbe = Invoke-NativeCommandResult $npmExecutable @('view', $packageSpec, 'version', '--json')
if ($versionProbe.ExitCode -eq 0) {
    throw 'The prerelease is already public. Refusing private-stage reconciliation.'
}
if ($versionProbe.Output -notmatch 'E404|No match found') {
    throw 'The public prerelease absence check failed unexpectedly.'
}

$stageList = @(Convert-CommandJson `
    (Invoke-NativeCommandResult $npxExecutable @('--yes', "npm@$NpmStageCliVersion", 'stage', 'list', $manifest.package.name, '--json')) `
    'Existing private-stage list')
$stageView = Convert-CommandJson `
    (Invoke-NativeCommandResult $npxExecutable @('--yes', "npm@$NpmStageCliVersion", 'stage', 'view', $stageId, '--json')) `
    'Existing private-stage view'
Assert-ExistingStageMetadata $stageList $stageView $manifest $stageId

$downloadRoot = Join-Path $repoRoot "tmp\search-v2-staged-reconciliation-$($actualManifestSha256.Substring(0, 12))"
$null = New-Item -ItemType Directory -Path $downloadRoot -Force
Get-ChildItem -LiteralPath $downloadRoot -Filter '*.tgz' -File -ErrorAction SilentlyContinue | Remove-Item -Force
$downloadResult = Invoke-NativeCommandResult `
    $npxExecutable `
    @('--yes', "npm@$NpmStageCliVersion", 'stage', 'download', $stageId, '--json') `
    $downloadRoot
if ($downloadResult.ExitCode -ne 0) {
    throw 'The existing private staged archive could not be downloaded.'
}
$downloadedArchives = @(Get-ChildItem -LiteralPath $downloadRoot -Filter '*.tgz' -File)
if ($downloadedArchives.Count -ne 1) {
    throw 'The existing private stage download did not produce exactly one archive.'
}
$downloadedArchive = $downloadedArchives[0]
if ((Get-FileHash -Algorithm SHA256 -LiteralPath $downloadedArchive.FullName).Hash.ToLowerInvariant() -ne $manifest.package.archive_sha256) {
    throw 'The existing private staged archive does not match the approved SHA-256.'
}

$smokePath = Join-Path $repoRoot $manifest.artifacts.published_smoke
& node $smokePath `
    --package-spec $downloadedArchive.FullName `
    --expected-version $manifest.package.version `
    --expected-route-fingerprint $manifest.search_contract.stdio_route_fingerprint
if ($LASTEXITCODE -ne 0) {
    throw 'The existing private staged archive failed the installed-package smoke.'
}

$stageRecordPath = Get-LocalStatePath 'staged-releases' "$actualManifestSha256.json"
New-VerifiedStageRecord `
    $stageRecordPath $manifest $actualManifestSha256 $packageSpec $stageId

Write-Output ([pscustomobject]@{
    status = 'staged_and_verified'
    package = $packageSpec
    tag = $manifest.package.publish_tag
    stage_id = $stageId
    archive_sha256 = $manifest.package.archive_sha256
    downloaded_archive_verified = $true
    installed_smoke_verified = $true
    additional_stage_publish_calls = 0
    next_access_step = 'Open npmjs.com Staged Packages and approve this exact stage with the account security key.'
} | ConvertTo-Json -Depth 4)
