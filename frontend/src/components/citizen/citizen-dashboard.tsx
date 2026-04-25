"use client";

import { useMemo, useState } from "react";

import { CHANNELS, MOROCCAN_REGIONS, MILIEUX, RISK_LEVELS } from "@/lib/api/constants";
import { useActiveCampaigns, usePreference, useUpdatePreference } from "@/lib/api/hooks";
import { api } from "@/lib/api/client";
import type { ActiveCampaignQuery, ChannelName, MilieuName, RiskLevelName } from "@/lib/api/types";

const DEFAULT_PROFILE: ActiveCampaignQuery = {
  age: 43,
  region: "Casablanca-Settat",
  milieu: "Urbain",
  risk_level: "Low",
};

export function CitizenDashboard() {
  const [patientId, setPatientId] = useState<number>(1);
  const [profile, setProfile] = useState<ActiveCampaignQuery>(DEFAULT_PROFILE);
  const [engagementStatus, setEngagementStatus] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );
  const [preferenceStatus, setPreferenceStatus] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );
  const [isTrackingAction, setIsTrackingAction] = useState(false);

  const activeCampaignsQuery = useActiveCampaigns(profile);
  const preferenceQuery = usePreference(patientId);
  const updatePreferenceMutation = useUpdatePreference(patientId);

  const topCampaign = useMemo(() => {
    const campaigns = activeCampaignsQuery.data ?? [];
    return campaigns.length > 0 ? campaigns[0] : null;
  }, [activeCampaignsQuery.data]);

  async function handleQuickAction(action: "click" | "adherence") {
    if (!topCampaign) {
      return;
    }

    setEngagementStatus(null);
    setIsTrackingAction(true);
    try {
      if (action === "click") {
        await api.trackClick(patientId, topCampaign.id);
        setEngagementStatus({ variant: "success", message: `Tracked click for campaign #${topCampaign.id}.` });
        return;
      }
      await api.trackAdherence(patientId, topCampaign.id);
      setEngagementStatus({ variant: "success", message: `Tracked adherence for campaign #${topCampaign.id}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to track engagement action";
      setEngagementStatus({ variant: "error", message });
    } finally {
      setIsTrackingAction(false);
    }
  }

  async function onChannelChange(channel: ChannelName) {
    setPreferenceStatus(null);
    try {
      await updatePreferenceMutation.mutateAsync(channel);
      setPreferenceStatus({ variant: "success", message: `Preference updated to ${channel}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update preference";
      setPreferenceStatus({ variant: "error", message });
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Profile filters</h2>
        <p className="mt-1 text-sm text-slate-600">Active campaigns match these demographics via the gateway.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            Risk level
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
        <h2 className="text-lg font-semibold text-slate-900">Personalized Active Campaigns</h2>
        <p className="mt-1 text-sm text-slate-600">Results refresh when you change profile filters above.</p>

        {activeCampaignsQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading campaigns...</p>
        ) : activeCampaignsQuery.isError ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            Failed to load active campaigns.{" "}
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
            No active campaigns match this profile yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-2">
            {activeCampaignsQuery.data?.slice(0, 5).map((campaign) => (
              <article key={campaign.id} className="rounded-xl border border-slate-200 bg-orange-50/40 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  #{campaign.id} - {campaign.name}
                </p>
                <p className="mt-1 text-xs text-slate-600">Status: {campaign.status}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Engagement Actions</h2>
        <p className="mt-1 text-sm text-slate-600">Quick aliases for click and adherence on the top matching campaign.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleQuickAction("click")}
            data-testid="track-click-button"
            disabled={!topCampaign || isTrackingAction}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isTrackingAction ? "Tracking..." : "Track Click"}
          </button>
          <button
            type="button"
            onClick={() => void handleQuickAction("adherence")}
            data-testid="track-adherence-button"
            disabled={!topCampaign || isTrackingAction}
            className="rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-orange-300"
          >
            {isTrackingAction ? "Tracking..." : "Track Adherence"}
          </button>
        </div>
        {engagementStatus ? (
          <p
            data-testid="citizen-engagement-status"
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              engagementStatus.variant === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-red-200 bg-red-50 text-red-900"
            }`}
            role="status"
          >
            {engagementStatus.message}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Communication Preferences</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <label htmlFor="patient-id" className="text-slate-700">
            Patient ID
          </label>
          <input
            id="patient-id"
            type="number"
            min={1}
            value={patientId}
            onChange={(event) => setPatientId(Number(event.target.value || 1))}
            data-testid="citizen-patient-id-input"
            className="w-24 rounded-lg border border-slate-300 px-2 py-1"
          />
        </div>

        {preferenceQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading preference...</p>
        ) : preferenceQuery.isError ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            Failed to load preference.{" "}
            <button
              type="button"
              onClick={() => void preferenceQuery.refetch()}
              className="font-medium text-sky-800 underline hover:text-sky-600"
            >
              Retry
            </button>
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {CHANNELS.map((channel) => {
              const selected = preferenceQuery.data?.channel === channel;
              return (
                <button
                  key={channel}
                  type="button"
                  onClick={() => void onChannelChange(channel)}
                  data-testid={`channel-${channel.toLowerCase()}`}
                  disabled={updatePreferenceMutation.isPending}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    selected
                      ? "border-sky-700 bg-sky-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {channel}
                </button>
              );
            })}
          </div>
        )}

        {preferenceStatus ? (
          <p
            data-testid="citizen-preference-status"
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              preferenceStatus.variant === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-red-200 bg-red-50 text-red-900"
            }`}
            role="status"
          >
            {preferenceStatus.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
