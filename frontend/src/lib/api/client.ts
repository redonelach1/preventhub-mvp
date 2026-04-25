import type {
  ActiveCampaignQuery,
  Campaign,
  ChannelName,
  CommunicationPreference,
  CreateCampaignInput,
  CreateRuleInput,
  MessageTemplate,
  RegionalCoverageResponse,
  RoiResponse,
  StratifyResponse,
  TrackingEvent,
} from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status} on ${path}: ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      sp.set(key, String(value));
    }
  });
  const asString = sp.toString();
  return asString ? `?${asString}` : "";
}

export const api = {
  health() {
    return request<{ status: string; service: string }>("/api/campaigns/health");
  },

  listCampaigns() {
    return request<Campaign[]>("/api/campaigns/");
  },

  createCampaign(payload: CreateCampaignInput) {
    return request<Campaign>("/api/campaigns/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getCampaign(campaignId: number) {
    return request<Campaign>(`/api/campaigns/${campaignId}`);
  },

  addRule(campaignId: number, payload: CreateRuleInput) {
    return request(`/api/campaigns/${campaignId}/rules`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  launchCampaign(campaignId: number) {
    return request<Campaign>(`/api/campaigns/${campaignId}/launch`, {
      method: "POST",
    });
  },

  listActiveCampaigns(query: ActiveCampaignQuery = {}) {
    return request<Campaign[]>(
      `/api/campaigns/active${queryString({
        age: query.age,
        region: query.region,
        milieu: query.milieu,
        risk_level: query.risk_level,
      })}`,
    );
  },

  stratifyAudience(campaignId: number, rules: CreateRuleInput[]) {
    return request<StratifyResponse>(`/api/stratify/stratify/${campaignId}`, {
      method: "POST",
      body: JSON.stringify({ rules }),
    });
  },

  trackClick(patientId: number, campaignId: number) {
    return request<TrackingEvent>("/api/engagement/track/click", {
      method: "POST",
      body: JSON.stringify({ patient_id: patientId, campaign_id: campaignId }),
    });
  },

  trackAdherence(patientId: number, campaignId: number) {
    return request<TrackingEvent>("/api/engagement/track/adherence", {
      method: "POST",
      body: JSON.stringify({ patient_id: patientId, campaign_id: campaignId }),
    });
  },

  trackEvent(patientId: number, campaignId: number, action: "clicked" | "booked") {
    return request<TrackingEvent>("/api/engagement/track", {
      method: "POST",
      body: JSON.stringify({ patient_id: patientId, campaign_id: campaignId, action }),
    });
  },

  getRoi(campaignId: number) {
    return request<RoiResponse>(`/api/analytics/roi/${campaignId}`);
  },

  getRegionalCoverage(campaignId: number) {
    return request<RegionalCoverageResponse>(
      `/api/analytics/coverage/regional${queryString({ campaign_id: campaignId })}`,
    );
  },

  listTemplates() {
    return request<MessageTemplate[]>("/api/communication/templates");
  },

  getPreference(patientId: number) {
    return request<CommunicationPreference>(`/api/communication/preferences/${patientId}`);
  },

  updatePreference(patientId: number, channel: ChannelName) {
    return request<CommunicationPreference>(`/api/communication/preferences/${patientId}`, {
      method: "PUT",
      body: JSON.stringify({ channel }),
    });
  },
};
