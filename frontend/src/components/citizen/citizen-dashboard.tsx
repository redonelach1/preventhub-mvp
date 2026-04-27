"use client";

import { useState } from "react";

import { CHANNELS, MOROCCAN_REGIONS, MILIEUX, RISK_LEVELS } from "@/lib/api/constants";
import { useActiveCampaigns, usePreference, useUpdatePreference, useActivity, useMessageTemplates } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import { StatusMessage } from "@/components/ui/status-message";
import type { ActivityItem, ActiveCampaignQuery, Campaign, ChannelName, MilieuName, RiskLevelName } from "@/lib/api/types";

const DEFAULT_PROFILE: ActiveCampaignQuery = {
  age: 43,
  region: "Casablanca-Settat",
  milieu: "Urbain",
  risk_level: "Low",
};

function CampaignCard({
  campaign,
  isSelected,
  onSelect,
}: {
  campaign: Campaign;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
        isSelected
          ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
          : "border-slate-200 bg-white hover:border-orange-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{campaign.name}</p>
          <p className="mt-1 text-xs text-slate-500">Campaign #{campaign.id}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            campaign.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {campaign.status}
        </span>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-xs text-slate-500 font-medium">Targeting Criteria</p>
        <div className="flex flex-wrap gap-1">
          {campaign.rules.length === 0 ? (
            <span className="text-xs text-slate-400">No specific targeting rules</span>
          ) : (
            campaign.rules.map((rule, idx) => (
              <span
                key={idx}
                className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {rule.min_age}-{rule.max_age}yo, {rule.region}, {rule.milieu}, {rule.risk_level}
              </span>
            ))
          )}
        </div>
      </div>
    </button>
  );
}

function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Recent';
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recent';
  }
}

function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-slate-200 rounded"></div>
      ))}
    </div>
  );
}

function EmptyState({ 
  title, 
  message, 
  action 
}: { 
  title: string; 
  message: string; 
  action?: React.ReactNode 
}) {
  return (
    <div className="text-center py-6">
      <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function TemplatePreview({ campaignId }: { campaignId: number }) {
  const templatesQuery = useMessageTemplates();
  
  const templateContent = templatesQuery.data?.[0]?.content || 
    "Your recommended prevention opportunity is available. Book your appointment today.";
  
  return (
    <div className="mt-4 rounded-lg border border-orange-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Message Preview</p>
      <p className="mt-2 text-sm text-slate-600 italic">&ldquo;{templateContent}&rdquo;</p>
    </div>
  );
}

function ActivitySection({ patientId }: { patientId: number }) {
  const activityQuery = useActivity(patientId);
  const activities = activityQuery.data?.activities ?? [];

  const typeLabels: Record<string, string> = {
    message: "Message Received",
    click: "You Showed Interest",
    booked: "Appointment Booked",
  };

  const typeColors: Record<string, string> = {
    message: "bg-blue-100 text-blue-700",
    click: "bg-slate-100 text-slate-700",
    booked: "bg-emerald-100 text-emerald-700",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Your Activity</h2>
      
      {activityQuery.isLoading ? (
        <p className="mt-3 text-sm text-slate-600">Loading...</p>
      ) : activityQuery.isError ? (
        <p className="mt-3 text-sm text-red-600">
          Failed to load activity.{' '}
          <button type="button" onClick={() => void activityQuery.refetch()} className="font-medium text-sky-700 underline">
            Retry
          </button>
        </p>
      ) : activities.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          No activity yet. Select a campaign above to get started.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {activities.slice(0, 5).map((item: ActivityItem, idx: number) => (
            <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{item.campaign_name}</p>
                <p className="text-xs text-slate-500">
                  {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "Recent"}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  typeColors[item.type] || "bg-slate-100 text-slate-700"
                }`}
              >
                {typeLabels[item.type] || item.type}
              </span>
            </div>
          ))}
          {activities.length > 5 && (
            <p className="text-xs text-slate-500">
              +{activities.length - 5} more activities
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function CitizenDashboard() {
  const [patientId, setPatientId] = useState<number>(1);
  const [profile, setProfile] = useState<ActiveCampaignQuery>(DEFAULT_PROFILE);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [engagementStatus, setEngagementStatus] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );
  const [preferenceStatus, setPreferenceStatus] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );
  const [isEngaged, setIsEngaged] = useState(false);

  const activeCampaignsQuery = useActiveCampaigns(profile);
  const preferenceQuery = usePreference(patientId);
  const updatePreferenceMutation = useUpdatePreference(patientId);

  async function handleEngagement(action: "interested" | "book") {
    if (patientId <= 0) {
      setEngagementStatus({ variant: "error", message: "Please enter a valid Patient ID first." });
      return;
    }

    if (!selectedCampaign) {
      setEngagementStatus({ variant: "error", message: "Please select a campaign first." });
      return;
    }

    setEngagementStatus(null);
    setIsEngaged(true);
    try {
      if (action === "interested") {
        await api.trackClick(patientId, selectedCampaign.id);
        setEngagementStatus({
          variant: "success",
          message: `You're marked as interested in "${selectedCampaign.name}". We'll send updates to your preferred channel.`,
        });
      } else {
        await api.trackAdherence(patientId, selectedCampaign.id);
        setEngagementStatus({
          variant: "success",
          message: `Appointment booked for "${selectedCampaign.name}". You'll receive confirmation shortly.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed. Please try again.";
      setEngagementStatus({ variant: "error", message });
    } finally {
      setIsEngaged(false);
    }
  }

  async function onChannelChange(channel: ChannelName) {
    if (patientId <= 0) {
      setPreferenceStatus({ variant: "error", message: "Please enter a valid Patient ID first." });
      return;
    }

    setPreferenceStatus(null);
    try {
      await updatePreferenceMutation.mutateAsync(channel);
      setPreferenceStatus({ variant: "success", message: `You'll receive updates via ${channel}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update preference";
      setPreferenceStatus({ variant: "error", message });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Your Profile</h2>
          <p className="mt-1 text-sm text-slate-600">
            Campaigns are filtered based on your demographics. Update to see different recommendations.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-slate-700">
              Age
              <input
                type="number"
                min={0}
                max={120}
                data-testid="citizen-filter-age"
                value={profile.age ?? ""}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    age: event.target.value === "" ? undefined : Number(event.target.value),
                  }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              Region
              <select
                data-testid="citizen-filter-region"
                value={profile.region ?? MOROCCAN_REGIONS[0]}
                onChange={(event) => setProfile((prev) => ({ ...prev, region: event.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                {MOROCCAN_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              Milieu
              <select
                data-testid="citizen-filter-milieu"
                value={profile.milieu ?? "Urbain"}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, milieu: event.target.value as MilieuName }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                {MILIEUX.map((milieu) => (
                  <option key={milieu} value={milieu}>
                    {milieu}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm text-slate-700">
              Risk Level
              <select
                data-testid="citizen-filter-risk"
                value={profile.risk_level ?? "Low"}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, risk_level: event.target.value as RiskLevelName }))
                }
                className="rounded-lg border border-slate-300 px-3 py-2"
              >
                {RISK_LEVELS.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recommended Campaigns</h2>
            <span className="text-xs text-slate-500">
              {activeCampaignsQuery.data?.length ?? 0} available
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Select a campaign below to take action.
          </p>

          {activeCampaignsQuery.isLoading ? (
            <div className="mt-4"><LoadingSkeleton /></div>
          ) : activeCampaignsQuery.isError ? (
            <p className="mt-4 text-sm text-red-700" role="alert">
              Failed to load campaigns.{" "}
              <button
                type="button"
                onClick={() => void activeCampaignsQuery.refetch()}
                className="font-medium text-sky-800 underline hover:text-sky-600"
              >
                Retry
              </button>
            </p>
          ) : (activeCampaignsQuery.data?.length ?? 0) === 0 ? (
            <p data-testid="citizen-no-campaigns" className="mt-4 text-sm text-slate-600">
              No active campaigns match your profile currently. Try adjusting your filters above.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {activeCampaignsQuery.data?.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  isSelected={selectedCampaign?.id === campaign.id}
                  onSelect={() => {
                    setSelectedCampaign(campaign);
                    setEngagementStatus(null);
                    setIsEngaged(false);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {selectedCampaign && (
          <section className="rounded-2xl border-2 border-orange-400 bg-orange-50/50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Take Action</h2>
            <p className="mt-1 text-sm text-slate-600">
              You selected: <span className="font-medium">{selectedCampaign.name}</span>
            </p>
            
            <TemplatePreview campaignId={selectedCampaign.id} />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleEngagement("interested")}
                disabled={isEngaged}
                data-testid="track-click-button"
                className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isEngaged ? "Processing..." : "I'm Interested"}
              </button>
              <button
                type="button"
                onClick={() => void handleEngagement("book")}
                disabled={isEngaged}
                data-testid="track-book-button"
                className="rounded-full bg-orange-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-300"
              >
                {isEngaged ? "Processing..." : "Book Appointment"}
              </button>
            </div>

            {engagementStatus ? (
              <div className="mt-4">
                <StatusMessage
                  variant={engagementStatus.variant}
                  message={engagementStatus.message}
                  testId="citizen-engagement-status"
                />
              </div>
            ) : null}
          </section>
        )}
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Your Information</h2>
          
          <div className="mt-4">
            <label htmlFor="patient-id" className="block text-sm font-medium text-slate-700">
              Patient ID
            </label>
            <input
              id="patient-id"
              type="number"
              min={1}
              value={patientId}
              onChange={(event) => setPatientId(Number(event.target.value || 0))}
              data-testid="citizen-patient-id-input"
              aria-invalid={patientId <= 0}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
            {patientId <= 0 && (
              <p className="mt-1 text-xs text-red-600">Enter a valid Patient ID</p>
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700">Communication Channel</p>
            <p className="mt-1 text-xs text-slate-500">How would you like to receive updates?</p>
            
            {preferenceQuery.isLoading ? (
              <p className="mt-3 text-sm text-slate-600">Loading...</p>
            ) : preferenceQuery.isError ? (
              <p className="mt-3 text-sm text-red-600">
                Failed to load.{" "}
                <button
                  type="button"
                  onClick={() => void preferenceQuery.refetch()}
                  className="font-medium text-sky-700 underline"
                >
                  Retry
                </button>
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {CHANNELS.map((channel) => {
                  const selected = preferenceQuery.data?.channel === channel;
                  return (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => void onChannelChange(channel)}
                      data-testid={`channel-${channel.toLowerCase()}`}
                      disabled={updatePreferenceMutation.isPending || patientId <= 0}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        selected
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-orange-300"
                      } disabled:opacity-50`}
                    >
                      {channel}
                    </button>
                  );
                })}
              </div>
            )}

            {preferenceStatus ? (
              <div className="mt-3">
                <StatusMessage
                  variant={preferenceStatus.variant}
                  message={preferenceStatus.message}
                  testId="citizen-preference-status"
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Why these campaigns?</h3>
          <p className="mt-2 text-xs text-slate-600">
            Campaigns are shown based on your age ({profile.age}), region ({profile.region}), 
            milieu ({profile.milieu}), and risk level ({profile.risk_level}). Update your profile 
            to see different recommendations.
          </p>
        </section>

        {patientId > 0 && (
          <ActivitySection patientId={patientId} />
        )}
      </div>
    </div>
  );
}
