param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-f0-9]{64}$')]
    [string]$ManifestHash,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,

    [Parameter(Mandatory = $true)]
    [ValidateSet('measure', 'finalize')]
    [string]$Phase,

    [string]$LiveEvidencePath,

    [string]$AuthorizationManifestPath = 'docs/si-v2/search/reviews/search-v2-search-only-beta-authorization-manifest-2026-07-16.json',

    [switch]$ExecuteApprovedGateC
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedGateC) {
    throw 'This runner can send live beta requests. Pass -ExecuteApprovedGateC only under an approved release manifest.'
}

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$measurementScript = Join-Path $PSScriptRoot 'run-search-v2-latency-measurement.mjs'
$evidenceScript = Join-Path $PSScriptRoot 'search-v2-gate-c-evidence.mjs'

function Resolve-RepositoryPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $Path))
}

$outputRoot = Resolve-RepositoryPath -Path $OutputDirectory
$manifestPath = Resolve-RepositoryPath -Path $AuthorizationManifestPath
$searchPath = Join-Path $outputRoot 'search.json'
$localizedPath = Join-Path $outputRoot 'localized.json'
$smokePath = Join-Path $outputRoot 'smoke.json'
$localGatePath = Join-Path $outputRoot 'local-release-gates.json'

function Read-JsonFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required Gate C evidence file is missing: $Path"
    }
    return Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

function Invoke-MeasurementStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Mode,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath
    )

    & node $measurementScript `
        --mode $Mode `
        --variant treatment `
        --manifest-hash $ManifestHash `
        --output $OutputPath

    if ($LASTEXITCODE -ne 0) {
        throw "Gate C $Mode request checks failed. Stop the release and follow the approved rollback."
    }

    return Read-JsonFile -Path $OutputPath
}

function Assert-PerformanceArtifacts {
    $search = Read-JsonFile -Path $searchPath
    if ($search.warm_summary.error_rate_percent -gt 1 -or $search.warm_summary.p95_ms -gt 2000) {
        throw 'Gate C search performance failed. Stop the release and follow the approved rollback.'
    }

    $localized = Read-JsonFile -Path $localizedPath
    if ($localized.warm_summary.error_rate_percent -gt 1 -or $localized.warm_summary.p95_ms -gt 2000) {
        throw 'Gate C localized performance failed. Stop the release and follow the approved rollback.'
    }

    $smoke = Read-JsonFile -Path $smokePath
    if (-not $smoke.smoke_summary.all_passed) {
        throw 'Gate C Material or invalid-request smoke failed. Stop the release and follow the approved rollback.'
    }

    return [pscustomobject]@{
        search = $search
        localized = $localized
        smoke = $smoke
    }
}

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

if ($Phase -eq 'measure') {
    $search = Invoke-MeasurementStep -Mode 'search' -OutputPath $searchPath
    if ($search.warm_summary.error_rate_percent -gt 1 -or $search.warm_summary.p95_ms -gt 2000) {
        throw 'Gate C search performance failed. Stop the release and follow the approved rollback.'
    }

    $localized = Invoke-MeasurementStep -Mode 'localized' -OutputPath $localizedPath
    if ($localized.warm_summary.error_rate_percent -gt 1 -or $localized.warm_summary.p95_ms -gt 2000) {
        throw 'Gate C localized performance failed. Stop the release and follow the approved rollback.'
    }

    $smoke = Invoke-MeasurementStep -Mode 'smoke' -OutputPath $smokePath
    if (-not $smoke.smoke_summary.all_passed) {
        throw 'Gate C Material or invalid-request smoke failed. Stop the release and follow the approved rollback.'
    }

    [pscustomobject]@{
        status = 'evidence_pending'
        manifest_sha256 = $ManifestHash
        search_p95_ms = $search.warm_summary.p95_ms
        localized_p95_ms = $localized.warm_summary.p95_ms
        material_and_invalid_smoke = $smoke.smoke_summary.all_passed
        required_next_phase = 'finalize'
        output_directory = $outputRoot
    } | ConvertTo-Json -Depth 4

    throw 'Gate C measurements passed, but evidence is pending. Run finalize only after platform, audit, production-function, npm, recommendation-parity, and usage-dedupe evidence is ready.'
}

$artifacts = Assert-PerformanceArtifacts
if (-not $LiveEvidencePath) {
    throw 'Finalize requires -LiveEvidencePath with readable platform, audit, production-function, and npm evidence.'
}
$resolvedLiveEvidencePath = Resolve-RepositoryPath -Path $LiveEvidencePath
Read-JsonFile -Path $resolvedLiveEvidencePath | Out-Null

& npm run verify:search-v2-tool-scoped-beta
if ($LASTEXITCODE -ne 0) {
    throw 'Gate C recommendation response parity failed.'
}

& npm run verify:mcp-usage-dedupe
if ($LASTEXITCODE -ne 0) {
    throw 'Gate C usage dedupe verification failed.'
}

$localGateJson = @{
    recommendation_response_byte_parity = $true
    usage_dedupe = $true
} | ConvertTo-Json
[System.IO.File]::WriteAllText(
    $localGatePath,
    "$localGateJson`n",
    [System.Text.UTF8Encoding]::new($false)
)

$gateOutput = & node $evidenceScript `
    --manifest $manifestPath `
    --manifest-hash $ManifestHash `
    --search $searchPath `
    --localized $localizedPath `
    --smoke $smokePath `
    --live-evidence $resolvedLiveEvidencePath `
    --local-gates $localGatePath

if ($LASTEXITCODE -ne 0) {
    throw 'Gate C complete evidence verification failed. Do not publish.'
}

$gateOutput -join "`n"
