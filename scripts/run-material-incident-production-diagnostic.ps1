param(
    [switch]$ExecuteApprovedMaterialIncidentSqlDiagnostic
)

$ErrorActionPreference = 'Stop'

if (-not $ExecuteApprovedMaterialIncidentSqlDiagnostic) {
    throw 'This runner is limited to an owner-approved Material incident SQL diagnostic. Pass -ExecuteApprovedMaterialIncidentSqlDiagnostic to continue.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$sqlDirectory = Join-Path $PSScriptRoot 'sql'
$sqlPath = Join-Path $sqlDirectory 'material-incident-production-diagnostic.sql'
$poolerPath = Join-Path $repoRoot 'supabase\.temp\pooler-url'
$sqlOutputPath = Join-Path $repoRoot 'tmp\material-incident-sql-diagnostic-2026-07-15.txt'
$healthBeforePath = Join-Path $repoRoot 'tmp\material-incident-health-before-2026-07-15.json'
$healthAfterPath = Join-Path $repoRoot 'tmp\material-incident-health-after-2026-07-15.json'
$projectRef = 'kcjmkakdhsqplvasgkjv'
$functionName = 'mcp-search'
$expectedFunctionVersion = 38
$expectedSqlHash = '1eae111b4d2f4e88bf3f4ff05becff1ad5858be77955586adead3e20543efb43'
$postgresImage = 'public.ecr.aws/supabase/postgres:17.6.1.132'
$endpoint = "https://$projectRef.supabase.co/functions/v1/$functionName"

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

function Write-Utf8Text {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $utf8 = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Value, $utf8)
}

function Write-JsonEvidence {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [object]$Value
    )

    $json = $Value | ConvertTo-Json -Depth 10
    Write-Utf8Text -Path $Path -Value "$json`n"
}

function Get-StableFunctionMetadata {
    $functionListJson = & supabase functions list `
        --project-ref $projectRef `
        --output-format json `
        --log-level error
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to read the current Supabase function list. Run supabase login, then retry only under the same approval.'
    }

    $parsed = ($functionListJson -join "`n") | ConvertFrom-Json
    $functions = if ($parsed.functions) { @($parsed.functions) } else { @($parsed) }
    $matches = @($functions | Where-Object { $_.name -eq $functionName -or $_.slug -eq $functionName })
    if ($matches.Count -ne 1) {
        throw "Expected one $functionName function entry but found $($matches.Count)."
    }

    $function = $matches[0]
    $version = [int]$function.version
    $verifyJwt = "$($function.verify_jwt)".Trim().ToLowerInvariant()
    if ($version -ne $expectedFunctionVersion) {
        throw "Expected $functionName version $expectedFunctionVersion but found $version."
    }
    if ($verifyJwt -notin @('false', '0')) {
        throw "Expected $functionName verify_jwt=false but found $($function.verify_jwt)."
    }

    return [pscustomobject]@{
        name = $functionName
        version = $version
        verify_jwt = $false
        status = $function.status
        updated_at = $function.updated_at
    }
}

function Invoke-StableHealthProbe {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('before', 'after')]
        [string]$Phase,

        [Parameter(Mandatory = $true)]
        [object]$FunctionMetadata
    )

    $requestId = "material-incident-diagnostic-$Phase-$([guid]::NewGuid().ToString('N'))"
    $body = @{
        query = 'calendar'
        library = 'lucide'
        library_mode = 'strict'
        style = 'outline'
        limit = 5
        source = 'verify'
        channel = 'internal_test'
        environment = 'production'
        client_family = 'material_incident_diagnostic'
        request_id = $requestId
        dedupe_key = $requestId
    } | ConvertTo-Json -Compress

    $startedAt = [System.Diagnostics.Stopwatch]::StartNew()
    $response = Invoke-WebRequest `
        -UseBasicParsing `
        -Method Post `
        -Uri $endpoint `
        -ContentType 'application/json' `
        -Body $body `
        -TimeoutSec 30
    $startedAt.Stop()

    $payload = $response.Content | ConvertFrom-Json
    $results = @($payload.results)
    $validSvgCount = @($results | Where-Object {
        $_.svg -is [string] -and $_.svg.Contains('<svg')
    }).Count

    if ([int]$response.StatusCode -ne 200) {
        throw "$Phase health probe returned HTTP $($response.StatusCode)."
    }
    if ($results.Count -lt 1 -or $validSvgCount -ne $results.Count) {
        throw "$Phase health probe did not return only deliverable Lucide SVG results."
    }

    return [pscustomobject]@{
        schema_version = 1
        phase = $Phase
        checked_at_utc = [DateTime]::UtcNow.ToString('o')
        function = $FunctionMetadata
        audit_contract = [pscustomobject]@{
            source = 'verify'
            channel = 'internal_test'
            environment = 'production'
            client_family = 'material_incident_diagnostic'
        }
        request = [pscustomobject]@{
            query = 'calendar'
            library = 'lucide'
            library_mode = 'strict'
            style = 'outline'
            limit = 5
        }
        http_status = [int]$response.StatusCode
        duration_ms = [Math]::Round($startedAt.Elapsed.TotalMilliseconds, 3)
        result_count = $results.Count
        valid_svg_count = $validSvgCount
        engine_version = $payload.engine_version
    }
}

function Invoke-ReadOnlySqlDiagnostic {
    $dockerArguments = @(
        'run',
        '--rm',
        '-i',
        '-e',
        'PGPASSWORD',
        '-e',
        'PGOPTIONS',
        '--mount',
        "type=bind,source=$sqlDirectory,target=/diagnostic,readonly",
        $postgresImage,
        'psql',
        $script:databaseUrl,
        '-X',
        '-v',
        'ON_ERROR_STOP=1',
        '-f',
        '/diagnostic/material-incident-production-diagnostic.sql'
    )

    $commandOutput = @(& docker @dockerArguments 2>&1 | ForEach-Object { "$_" })
    $exitCode = $LASTEXITCODE
    Write-Utf8Text -Path $sqlOutputPath -Value "$(($commandOutput -join "`n"))`n"
    if ($exitCode -ne 0) {
        throw 'The read-only SQL diagnostic failed. Retain the partial evidence and do not rerun without inspection and fresh approval.'
    }
}

if (-not (Test-Path -LiteralPath $sqlPath)) {
    throw "Diagnostic SQL is missing: $sqlPath"
}
if (-not (Test-Path -LiteralPath $poolerPath)) {
    throw 'Linked Supabase pooler information is missing. Run supabase link before this runner.'
}

$actualSqlHash = Get-NormalizedTextSha256 -Path $sqlPath
if ($actualSqlHash -ne $expectedSqlHash) {
    throw "Diagnostic SQL hash changed. Expected $expectedSqlHash but found $actualSqlHash."
}

foreach ($outputPath in @($sqlOutputPath, $healthBeforePath, $healthAfterPath)) {
    if (Test-Path -LiteralPath $outputPath) {
        throw "Diagnostic evidence already exists and will not be overwritten: $outputPath"
    }
}

& docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw 'Docker is not available.'
}

$poolerUrl = (Get-Content -Raw $poolerPath).Trim()
if (-not $poolerUrl.StartsWith('postgresql://')) {
    throw 'Linked Supabase pooler URL is invalid.'
}

$beforeMetadata = Get-StableFunctionMetadata
$beforeProbe = Invoke-StableHealthProbe -Phase 'before' -FunctionMetadata $beforeMetadata
Write-JsonEvidence -Path $healthBeforePath -Value $beforeProbe

$securePassword = Read-Host 'Supabase database password' -AsSecureString
try {
    $plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
    $env:PGPASSWORD = $plainPassword
    $env:PGOPTIONS = '-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000 -c idle_in_transaction_session_timeout=30000'
    $plainPassword = $null
    $script:databaseUrl = "${poolerUrl}?sslmode=require&application_name=supericons_material_incident_diagnostic"

    Invoke-ReadOnlySqlDiagnostic
}
finally {
    $plainPassword = $null
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGOPTIONS -ErrorAction SilentlyContinue
    Remove-Variable securePassword -ErrorAction SilentlyContinue
}

$afterMetadata = Get-StableFunctionMetadata
$afterProbe = Invoke-StableHealthProbe -Phase 'after' -FunctionMetadata $afterMetadata
Write-JsonEvidence -Path $healthAfterPath -Value $afterProbe

Write-Output "Material incident SQL diagnostic completed: $sqlOutputPath"
