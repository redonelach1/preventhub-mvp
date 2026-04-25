$ErrorActionPreference = 'Stop'

function Step($message) {
  Write-Host "`n==> $message" -ForegroundColor Cyan
}

function Pass($message) {
  Write-Host "[PASS] $message" -ForegroundColor Green
}

function Warn($message) {
  Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Fail($message) {
  Write-Host "[FAIL] $message" -ForegroundColor Red
  exit 1
}

function Assert-True {
  param(
    [Parameter(Mandatory = $true)][bool]$Condition,
    [Parameter(Mandatory = $true)][string]$Message
  )

  if (-not $Condition) {
    Fail $Message
  }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $false)]$Body
  )

  try {
    $params = @{
      Method = $Method
      Uri = $Url
      Headers = @{ "Content-Type" = "application/json" }
    }

    if ($null -ne $Body) {
      $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }

    return Invoke-RestMethod @params
  }
  catch {
    throw "Request failed: $Method $Url`n$($_.Exception.Message)"
  }
}

function Invoke-DockerCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Command
  )

  $scriptBlock = [scriptblock]::Create($Command)
  $output = & $scriptBlock 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "Docker command failed: $Command`n$output"
  }
  return ($output -join "`n")
}

function Normalize-Collection {
  param(
    [Parameter(Mandatory = $false)]$Value
  )

  if ($null -eq $Value) {
    return @()
  }

  if ($Value -is [System.Array]) {
    $items = @()
    foreach ($entry in $Value) {
      if ($entry -is [System.Array]) {
        $items += @($entry)
      } else {
        $items += $entry
      }
    }
    return $items
  }

  return @($Value)
}

function Wait-ForCondition {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Check,
    [Parameter(Mandatory = $true)][string]$Description,
    [int]$Attempts = 12,
    [int]$DelaySeconds = 2
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      $result = & $Check
      if ($result) {
        Pass "$Description (attempt $attempt/$Attempts)"
        return
      }
    }
    catch {
      if ($attempt -eq $Attempts) {
        throw
      }
    }

    Start-Sleep -Seconds $DelaySeconds
  }

  Fail "$Description timed out after $Attempts attempts"
}

$base = "http://localhost:8000"
$healthPaths = @(
  "/api/campaigns/health",
  "/api/stratify/health",
  "/api/communication/health",
  "/api/engagement/health",
  "/api/analytics/health"
)

$campaignPayload = @{
  name = "Frontend Readiness Campaign"
}

$rulePayload = @{
  min_age = 20
  max_age = 60
  region = "Casablanca-Settat"
  milieu = "Urbain"
  risk_level = "Low"
}

Step "Gateway and health checks"
foreach ($path in $healthPaths) {
  $health = Invoke-JsonRequest -Method GET -Url "$base$path"
  Assert-True ($null -ne $health) "Health response missing for $path"
  Assert-True ($health.status -eq "ok") "Health status not ok for $path"
  Pass "$path is healthy"
}

Step "Campaign creation contract"
$campaign = Invoke-JsonRequest -Method POST -Url "$base/api/campaigns/" -Body $campaignPayload
Assert-True ($null -ne $campaign) "Campaign creation returned no body"
Assert-True ($campaign.id -gt 0) "Campaign id was not created"
Assert-True ($campaign.name -eq $campaignPayload.name) "Campaign name mismatch"
Assert-True ($campaign.status -eq "DRAFT") "Campaign should start as DRAFT"
$campaignId = [int]$campaign.id
Pass "Campaign created with id=$campaignId"

Step "Campaign read and list contract"
$campaignDetail = Invoke-JsonRequest -Method GET -Url "$base/api/campaigns/$campaignId"
Assert-True ($null -ne $campaignDetail) "Campaign detail returned no body"
Assert-True ($campaignDetail.id -eq $campaignId) "Campaign detail id mismatch"
Assert-True ($campaignDetail.name -eq $campaignPayload.name) "Campaign detail name mismatch"
Assert-True (@($campaignDetail.rules).Count -eq 0) "Campaign detail should have zero rules before creation"

$campaignList = Normalize-Collection (Invoke-JsonRequest -Method GET -Url "$base/api/campaigns/")
Assert-True ($campaignList.Count -gt 0) "Campaign list returned no campaigns"
$campaignListIds = @($campaignList | ForEach-Object { [int]$_.id })
Assert-True ($campaignListIds -contains $campaignId) "Created campaign missing from list endpoint"
Pass "Campaign read and list endpoints are usable by the frontend"

Step "Targeting rule contract"
$rule = Invoke-JsonRequest -Method POST -Url "$base/api/campaigns/$campaignId/rules" -Body $rulePayload
Assert-True ($null -ne $rule) "Rule creation returned no body"
Assert-True ($rule.id -gt 0) "Rule id was not created"
Assert-True ($rule.campaign_id -eq $campaignId) "Rule campaign_id mismatch"
Assert-True ($rule.min_age -eq $rulePayload.min_age) "Rule min_age mismatch"
Assert-True ($rule.max_age -eq $rulePayload.max_age) "Rule max_age mismatch"
Assert-True ($rule.region -eq $rulePayload.region) "Rule region mismatch"
Assert-True ($rule.milieu -eq $rulePayload.milieu) "Rule milieu mismatch"
Assert-True ($rule.risk_level -eq $rulePayload.risk_level) "Rule risk_level mismatch"
Pass "Targeting rule created with full Moroccan segmentation fields"

Step "Campaign launch contract"
$launched = Invoke-JsonRequest -Method POST -Url "$base/api/campaigns/$campaignId/launch"
Assert-True ($null -ne $launched) "Campaign launch returned no body"
Assert-True ($launched.id -eq $campaignId) "Launched campaign id mismatch"
Assert-True ($launched.status -eq "ACTIVE") "Campaign should be ACTIVE after launch"
Pass "Campaign launched"

$campaignDetailAfterLaunch = Invoke-JsonRequest -Method GET -Url "$base/api/campaigns/$campaignId"
Assert-True (@($campaignDetailAfterLaunch.rules).Count -ge 1) "Campaign detail should expose targeting rules after creation"
Assert-True ($campaignDetailAfterLaunch.status -eq "ACTIVE") "Campaign detail should reflect ACTIVE status after launch"

$activeCampaigns = Normalize-Collection (Invoke-JsonRequest -Method GET -Url "$base/api/campaigns/active")
$activeCampaignIds = @($activeCampaigns | ForEach-Object { [int]$_.id })
Assert-True ($activeCampaignIds -contains $campaignId) "Active campaign missing from /active endpoint"

$personalizedActiveCampaigns = Normalize-Collection (
  Invoke-JsonRequest -Method GET -Url "$base/api/campaigns/active?age=43&region=Casablanca-Settat&milieu=Urbain&risk_level=Low"
)
$personalizedActiveCampaignIds = @($personalizedActiveCampaigns | ForEach-Object { [int]$_.id })
Assert-True ($personalizedActiveCampaignIds -contains $campaignId) "Campaign missing from personalized active campaign query"
Pass "Campaign read/list/active endpoints support admin and citizen frontend flows"

Step "Audience generation and stratification contract"
$strat = Invoke-JsonRequest -Method POST -Url "$base/api/stratify/stratify/$campaignId" -Body @{
  rules = @($rulePayload)
}
Assert-True ($null -ne $strat) "Stratification returned no body"
Assert-True ($strat.campaign_id -eq $campaignId) "Stratification campaign_id mismatch"
Assert-True ($null -ne $strat.patient_ids) "patient_ids missing from stratification response"
$matchedCount = [int]$strat.matched_count
$patientIds = @($strat.patient_ids)
Assert-True ($matchedCount -eq $patientIds.Count) "matched_count does not equal patient_ids count"
Assert-True ($matchedCount -gt 0) "Expected at least one patient match for frontend preview"
Assert-True (($patientIds | Select-Object -Unique).Count -eq $patientIds.Count) "patient_ids should be unique"
Pass "Stratification completed with $matchedCount matched patients"

Step "Engagement tracking contract"
$patientId = [int]$patientIds[0]
$booked = Invoke-JsonRequest -Method POST -Url "$base/api/engagement/track" -Body @{
  patient_id = $patientId
  campaign_id = $campaignId
  action = "booked"
}
Assert-True ($null -ne $booked) "Booked tracking returned no body"
Assert-True ($booked.patient_id -eq $patientId) "Tracked patient_id mismatch"
Assert-True ($booked.campaign_id -eq $campaignId) "Tracked campaign_id mismatch"
Assert-True ($booked.action -eq "booked") "Booked tracking action mismatch"
Pass "Tracked booked engagement for patient_id=$patientId"

if ($patientIds.Count -gt 1) {
  $clickedPatientId = [int]$patientIds[1]
  $clicked = Invoke-JsonRequest -Method POST -Url "$base/api/engagement/track" -Body @{
    patient_id = $clickedPatientId
    campaign_id = $campaignId
    action = "clicked"
  }
  Assert-True ($clicked.action -eq "clicked") "Clicked tracking action mismatch"
  Pass "Tracked clicked engagement for patient_id=$clickedPatientId"
} else {
  Warn "Only one patient matched; skipped extra clicked-event check"
}

Step "Analytics propagation and ROI readiness"
$roiResult = $null
Wait-ForCondition -Description "Analytics service processed message and engagement events" -Check {
  $script:roiResult = Invoke-JsonRequest -Method GET -Url "$base/api/analytics/roi/$campaignId"
  return (
    $null -ne $script:roiResult -and
    [int]$script:roiResult.total_messages -ge $matchedCount -and
    [int]$script:roiResult.total_bookings -ge 1
  )
}

Assert-True ($roiResult.campaign_id -eq $campaignId) "ROI campaign_id mismatch"
Assert-True ([int]$roiResult.total_messages -eq $matchedCount) "ROI total_messages should equal emitted audience size"
Assert-True ([int]$roiResult.total_bookings -eq 1) "ROI total_bookings should equal one booked engagement"
Assert-True ([double]$roiResult.conversion_rate -gt 0) "ROI conversion_rate should be positive"

$expectedRate = [math]::Round((1.0 / $matchedCount) * 100.0, 2)
Assert-True ([double]$roiResult.conversion_rate -eq $expectedRate) "ROI conversion_rate expected $expectedRate but got $($roiResult.conversion_rate)"

Write-Host "`n=== ROI RESULT ===" -ForegroundColor Magenta
$roiResult | ConvertTo-Json -Depth 5

Step "Engagement alias contract"
$trackClickAlias = Invoke-JsonRequest -Method POST -Url "$base/api/engagement/track/click" -Body @{
  patient_id = $patientId
  campaign_id = $campaignId
}
Assert-True ($trackClickAlias.action -eq "clicked") "track/click alias should emit clicked action"

$trackAdherenceAlias = Invoke-JsonRequest -Method POST -Url "$base/api/engagement/track/adherence" -Body @{
  patient_id = $patientId
  campaign_id = $campaignId
}
Assert-True ($trackAdherenceAlias.action -eq "booked") "track/adherence alias should emit booked action"
Pass "Engagement aliases support simpler frontend interactions"

Step "Communication preferences and templates contract"
$templates = Normalize-Collection (Invoke-JsonRequest -Method GET -Url "$base/api/communication/templates")
Assert-True ($templates.Count -ge 1) "Expected seeded communication templates"
Assert-True ([string]::IsNullOrWhiteSpace($templates[0].name) -eq $false) "Template name should not be empty"
Assert-True ([string]::IsNullOrWhiteSpace($templates[0].content) -eq $false) "Template content should not be empty"

$defaultPreference = Invoke-JsonRequest -Method GET -Url "$base/api/communication/preferences/$patientId"
Assert-True ($defaultPreference.patient_id -eq $patientId) "Default preference patient_id mismatch"
Assert-True (($defaultPreference.channel -eq "SMS") -or ($defaultPreference.channel -eq "Email") -or ($defaultPreference.channel -eq "Push")) "Default preference channel invalid"

$updatedPreference = Invoke-JsonRequest -Method PUT -Url "$base/api/communication/preferences/$patientId" -Body @{
  channel = "Push"
}
Assert-True ($updatedPreference.patient_id -eq $patientId) "Updated preference patient_id mismatch"
Assert-True ($updatedPreference.channel -eq "Push") "Updated preference channel mismatch"
Pass "Communication templates and preferences endpoints are ready for the frontend"

Step "Regional analytics contract"
$regionalCoverage = Invoke-JsonRequest -Method GET -Url "$base/api/analytics/coverage/regional?campaign_id=$campaignId"
Assert-True ($null -ne $regionalCoverage) "Regional coverage returned no body"
Assert-True ($regionalCoverage.campaign_id -eq $campaignId) "Regional coverage campaign_id mismatch"
Assert-True ($null -ne $regionalCoverage.regions) "Regional coverage regions missing"
$regionalRows = @($regionalCoverage.regions)
if ($regionalRows.Count -eq 0) {
  Write-Host "`n=== RAW REGIONAL COVERAGE RESPONSE ===" -ForegroundColor Magenta
  $regionalCoverage | ConvertTo-Json -Depth 10
}
Assert-True ($regionalRows.Count -ge 1) "Regional coverage should contain at least one region"
$firstRegionRow = $regionalRows[0]
Assert-True ([string]::IsNullOrWhiteSpace($firstRegionRow.region) -eq $false) "Regional coverage region name missing"
Assert-True ([int]$firstRegionRow.total_messages -ge 1) "Regional coverage total_messages should be positive"
Pass "Regional coverage analytics are available for dashboard views"

Step "Service communication verification"
$logCheck = $false
Wait-ForCondition -Description "Communication and analytics logs show event propagation" -Attempts 10 -DelaySeconds 2 -Check {
  $communicationLogs = Invoke-DockerCommand "docker compose logs --tail=200 communication-service"
  $analyticsLogs = Invoke-DockerCommand "docker compose logs --tail=200 analytics-service"
  $engagementLogs = Invoke-DockerCommand "docker compose logs --tail=100 engagement-service"

  $hasCommunicationLog = $communicationLogs -match "Sending Moroccan validated message to patient $patientId"
  $hasAnalyticsRoiLog = $analyticsLogs -match "/roi/$campaignId"
  $hasEngagementLog = $engagementLogs -match "POST /track HTTP/1.1`" 201 Created"

  if ($hasCommunicationLog -and $hasAnalyticsRoiLog -and $hasEngagementLog) {
    $script:logCheck = $true
    return $true
  }

  return $false
}
Assert-True $logCheck "Inter-service communication logs were not observed"
Pass "Services are communicating through Kafka and HTTP as expected"

Step "Seeded Moroccan data verification"
$patientCountRaw = Invoke-DockerCommand "docker compose exec -T postgres psql -U preventhub -d stratification_db -t -A -c ""SELECT COUNT(*) FROM patients;"""
$patientCount = [int]($patientCountRaw.Trim())
Assert-True ($patientCount -eq 5000) "Expected 5000 seeded patients but found $patientCount"

$sampleRows = Invoke-DockerCommand "docker compose exec -T postgres psql -U preventhub -d stratification_db -t -A -F ""|"" -c ""SELECT id, age, region, milieu, risk_level FROM patients ORDER BY id LIMIT 5;"""
$distributionRows = Invoke-DockerCommand "docker compose exec -T postgres psql -U preventhub -d stratification_db -t -A -F ""|"" -c ""SELECT region, milieu, risk_level, COUNT(*) AS total FROM patients GROUP BY region, milieu, risk_level ORDER BY total DESC LIMIT 5;"""

Assert-True ($sampleRows.Trim().Length -gt 0) "Expected sample seeded rows but query returned nothing"
Assert-True ($distributionRows.Trim().Length -gt 0) "Expected seed distribution rows but query returned nothing"

Write-Host "`n=== SEEDED PATIENT SAMPLE ===" -ForegroundColor Magenta
Write-Host $sampleRows
Write-Host "`n=== SEEDED DISTRIBUTION SAMPLE ===" -ForegroundColor Magenta
Write-Host $distributionRows
Pass "Seeded Moroccan patient dataset looks populated and queryable"

Step "Frontend readiness summary"
Write-Host "Gateway URL: $base" -ForegroundColor White
Write-Host "Campaign API: $base/api/campaigns/" -ForegroundColor White
Write-Host "Active Campaigns API: $base/api/campaigns/active" -ForegroundColor White
Write-Host "Stratification API: $base/api/stratify/" -ForegroundColor White
Write-Host "Engagement API: $base/api/engagement/" -ForegroundColor White
Write-Host "Analytics API: $base/api/analytics/" -ForegroundColor White
Write-Host "Regional Coverage API: $base/api/analytics/coverage/regional?campaign_id={id}" -ForegroundColor White
Write-Host "Communication Templates API: $base/api/communication/templates" -ForegroundColor White
Write-Host "Communication Preferences API: $base/api/communication/preferences/{patient_id}" -ForegroundColor White

Pass "Backend passed frontend-readiness validation"
Write-Host "`nThe backend is ready for frontend integration: admin reads/writes work, citizen-facing discovery and preferences endpoints exist, seeded data is queryable, services communicate through Kafka, and analytics exposes both ROI and regional coverage." -ForegroundColor DarkGray
