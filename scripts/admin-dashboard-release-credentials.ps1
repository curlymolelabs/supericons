function Resolve-AdminDashboardReleaseCredential {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'ADMIN_SECRET')]
    [string]$Name,

    [scriptblock]$ProcessReader = {
      param([string]$VariableName)
      [Environment]::GetEnvironmentVariable($VariableName, 'Process')
    },

    [scriptblock]$UserReader = {
      param([string]$VariableName)
      [Environment]::GetEnvironmentVariable($VariableName, 'User')
    }
  )

  $processValue = & $ProcessReader $Name
  if (-not [string]::IsNullOrWhiteSpace($processValue)) {
    return [pscustomobject]@{
      value = "$processValue"
      source = 'process'
    }
  }

  $userValue = & $UserReader $Name
  if (-not [string]::IsNullOrWhiteSpace($userValue)) {
    return [pscustomobject]@{
      value = "$userValue"
      source = 'user'
    }
  }

  throw "Required credential is missing: $Name. Set it in the process or Windows user environment."
}

function Set-AdminDashboardReleaseProcessCredential {
  param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'ADMIN_SECRET')]
    [string]$SourceName,

    [Parameter(Mandatory = $true)]
    [ValidateSet('SUPABASE_ACCESS_TOKEN', 'PGPASSWORD', 'PHASE_A_ADMIN_SECRET')]
    [string]$TargetName,

    [scriptblock]$ProcessReader = {
      param([string]$VariableName)
      [Environment]::GetEnvironmentVariable($VariableName, 'Process')
    },

    [scriptblock]$UserReader = {
      param([string]$VariableName)
      [Environment]::GetEnvironmentVariable($VariableName, 'User')
    }
  )

  $resolved = Resolve-AdminDashboardReleaseCredential `
    -Name $SourceName `
    -ProcessReader $ProcessReader `
    -UserReader $UserReader
  $previousValue = [Environment]::GetEnvironmentVariable($TargetName, 'Process')
  [Environment]::SetEnvironmentVariable($TargetName, $resolved.value, 'Process')
  $resolved.value = $null

  return [pscustomobject]@{
    target_name = $TargetName
    previous_value = $previousValue
    source = $resolved.source
  }
}

function Restore-AdminDashboardReleaseProcessCredential {
  param(
    [Parameter(Mandatory = $true)]
    [object]$State
  )

  [Environment]::SetEnvironmentVariable(
    "$($State.target_name)",
    $State.previous_value,
    'Process'
  )
  $State.previous_value = $null
}
