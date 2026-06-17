param(
  [string]$Profile = "default",
  [string]$ModuleAddress = "0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f",
  [string]$ModuleName = "palate",
  [UInt64]$MinPushAmount = 10000000,
  [UInt64]$MinBuffAmount = 1000000,
  [UInt64]$SkipPenaltyAmount = 1000000,
  [UInt64]$MatchDurationSeconds = 600,
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Invoke-AptosJson {
  param(
    [string[]]$Arguments
  )

  $output = & aptos @Arguments --output json
  if ($LASTEXITCODE -ne 0) {
    throw "aptos command failed: aptos $($Arguments -join ' ')"
  }

  return $output | ConvertFrom-Json
}

function Get-ViewValue {
  param(
    [string]$FunctionName
  )

  $result = Invoke-AptosJson -Arguments @(
    "move", "view",
    "--function-id", "$ModuleAddress::$ModuleName::$FunctionName",
    "--profile", $Profile
  )

  if ($null -eq $result.Result -or $result.Result.Count -eq 0) {
    throw "No result returned for view $FunctionName"
  }

  return [UInt64]$result.Result[0]
}

$currentMinPushAmount = Get-ViewValue -FunctionName "getMinPushAmount"
$currentMinPushIncrementBps = Get-ViewValue -FunctionName "getMinPushIncrementBps"
$currentMinBuffAmount = Get-ViewValue -FunctionName "getMinBuffAmount"
$currentBuffCommitmentAmount = Get-ViewValue -FunctionName "getBuffCommitmentAmount"
$currentSkipPenaltyAmount = Get-ViewValue -FunctionName "getSkipPenaltyAmount"
$currentMatchDurationSeconds = Get-ViewValue -FunctionName "getMatchDurationSeconds"
$currentRandomRetryCount = Get-ViewValue -FunctionName "getRandomRetryCount"

$summary = [pscustomobject]@{
  profile = $Profile
  module = "$ModuleAddress::$ModuleName"
  current = [pscustomobject]@{
    min_push_amount = $currentMinPushAmount
    min_push_increment_bps = $currentMinPushIncrementBps
    min_buff_amount = $currentMinBuffAmount
    buff_commitment_amount = $currentBuffCommitmentAmount
    skip_penalty_amount = $currentSkipPenaltyAmount
    match_duration_seconds = $currentMatchDurationSeconds
    random_retry_count = $currentRandomRetryCount
  }
  target = [pscustomobject]@{
    min_push_amount = $MinPushAmount
    min_push_increment_bps = $currentMinPushIncrementBps
    min_buff_amount = $MinBuffAmount
    buff_commitment_amount = $currentBuffCommitmentAmount
    skip_penalty_amount = $SkipPenaltyAmount
    match_duration_seconds = $MatchDurationSeconds
    random_retry_count = $currentRandomRetryCount
  }
}

$summary | ConvertTo-Json -Depth 4

if (-not $Apply) {
  Write-Host ""
  Write-Host "Dry run only. Re-run with -Apply to submit transactions."
  exit 0
}

if ($currentBuffCommitmentAmount -lt $SkipPenaltyAmount) {
  throw "skip_penalty_amount ($SkipPenaltyAmount) cannot exceed current buff_commitment_amount ($currentBuffCommitmentAmount)."
}

& aptos move run `
  --function-id "$ModuleAddress::$ModuleName::updatePushConfig" `
  --args "u64:$MinPushAmount" "u64:$currentMinPushIncrementBps" `
  --profile $Profile `
  --assume-yes

if ($LASTEXITCODE -ne 0) {
  throw "updatePushConfig failed."
}

& aptos move run `
  --function-id "$ModuleAddress::$ModuleName::updateBuffConfig" `
  --args "u64:$MinBuffAmount" "u64:$currentBuffCommitmentAmount" "u64:$SkipPenaltyAmount" `
  --profile $Profile `
  --assume-yes

if ($LASTEXITCODE -ne 0) {
  throw "updateBuffConfig failed."
}

& aptos move run `
  --function-id "$ModuleAddress::$ModuleName::updateMatchConfig" `
  --args "u64:$MatchDurationSeconds" "u64:$currentRandomRetryCount" `
  --profile $Profile `
  --assume-yes

if ($LASTEXITCODE -ne 0) {
  throw "updateMatchConfig failed."
}

Write-Host ""
Write-Host "Updated protocol config. Reading back values..."

[pscustomobject]@{
  min_push_amount = Get-ViewValue -FunctionName "getMinPushAmount"
  min_push_increment_bps = Get-ViewValue -FunctionName "getMinPushIncrementBps"
  min_buff_amount = Get-ViewValue -FunctionName "getMinBuffAmount"
  buff_commitment_amount = Get-ViewValue -FunctionName "getBuffCommitmentAmount"
  skip_penalty_amount = Get-ViewValue -FunctionName "getSkipPenaltyAmount"
  match_duration_seconds = Get-ViewValue -FunctionName "getMatchDurationSeconds"
  random_retry_count = Get-ViewValue -FunctionName "getRandomRetryCount"
} | ConvertTo-Json -Depth 3
