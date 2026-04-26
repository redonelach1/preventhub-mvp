export type MilieuName = "Urbain" | "Rural";
export type RiskLevelName = "Low" | "Medium" | "High";
export type ChannelName = "Email" | "SMS" | "Push";

export type CampaignStatus = "DRAFT" | "ACTIVE";

export interface TargetingRule {
  id: number;
  campaign_id: number;
  min_age: number;
  max_age: number;
  region: string;
  milieu: MilieuName;
  risk_level: RiskLevelName;
}

export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus;
  rules: TargetingRule[];
}

export interface CreateCampaignInput {
  name: string;
}

export interface CreateRuleInput {
  min_age: number;
  max_age: number;
  region: string;
  milieu: MilieuName;
  risk_level: RiskLevelName;
}

export interface ActiveCampaignQuery {
  age?: number;
  region?: string;
  milieu?: MilieuName;
  risk_level?: RiskLevelName;
}

export interface StratifyResponse {
  campaign_id: number;
  patient_ids: number[];
  matched_count: number;
}

export interface RoiResponse {
  campaign_id: number;
  total_messages: number;
  total_bookings: number;
  conversion_rate: number;
}

export interface RegionalCoverageRow {
  region: string;
  total_messages: number;
  total_bookings: number;
  conversion_rate: number;
}

export interface RegionalCoverageResponse {
  campaign_id: number;
  regions: RegionalCoverageRow[];
}

export interface CommunicationPreference {
  patient_id: number;
  channel: ChannelName;
}

export interface MessageTemplate {
  id: number;
  name: string;
  content: string;
}

export interface TrackingEvent {
  id: number;
  patient_id: number;
  campaign_id: number;
  action: "clicked" | "booked";
}


export interface ActivityItem {
  type: string;
  campaign_id: number;
  campaign_name: string;
  timestamp: string | null;
}

export interface ActivityResponse {
  activities: ActivityItem[];
}
