param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-f0-9]{64}$')]
    [string]$ManifestHash,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory,

    [switch]$ExecuteApprovedGateC
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedGateC) {
    throw 'This runner sends live beta requests. Pass -ExecuteApprovedGateC only under an approved release manifest.'
}

$measurementScript = Join-Path $PSScriptRoot 'run-search-v2-latency-measurement.mjs'
$outputRoot = Join-Path (Split-Path -Parent $PSScriptRoot) $OutputDirectory

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

    return Get-Content -Raw $OutputPath | ConvertFrom-Json
}

New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$search = Invoke-MeasurementStep -Mode 'search' -OutputPath (Join-Path $outputRoot 'search.json')
if ($search.warm_summary.error_rate_percent -gt 1 -or $search.warm_summary.p95_ms -gt 2000) {
    throw 'Gate C search performance failed. Stop the release and follow the approved rollback.'
}

$localized = Invoke-MeasurementStep -Mode 'localized' -OutputPath (Join-Path $outputRoot 'localized.json')
if ($localized.warm_summary.error_rate_percent -gt 1 -or $localized.warm_summary.p95_ms -gt 2000) {
    throw 'Gate C localized performance failed. Stop the release and follow the approved rollback.'
}

$smoke = Invoke-MeasurementStep -Mode 'smoke' -OutputPath (Join-Path $outputRoot 'smoke.json')
if (-not $smoke.smoke_summary.all_passed) {
    throw 'Gate C Material or invalid-request smoke failed. Stop the release and follow the approved rollback.'
}

[pscustomobject]@{
    status = 'ok'
    manifest_sha256 = $ManifestHash
    search_p95_ms = $search.warm_summary.p95_ms
    localized_p95_ms = $localized.warm_summary.p95_ms
    material_and_invalid_smoke = $smoke.smoke_summary.all_passed
    output_directory = $outputRoot
} | ConvertTo-Json -Depth 4
