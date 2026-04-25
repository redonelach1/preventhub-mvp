"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { MOROCCAN_REGIONS, MILIEUX, RISK_LEVELS } from "@/lib/api/constants";
import {
  useAddRule,
  useCampaign,
  useCampaigns,
  useCreateCampaign,
  useLaunchCampaign,
  useRegionalCoverage,
  useRoi,
  useStratifyAudience,
} from "@/lib/api/hooks";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusMessage } from "@/components/ui/status-message";
import { toRuleInputs } from "@/lib/api/admin-utils";
import type { Campaign, CreateRuleInput, MilieuName, RiskLevelName } from "@/lib/api/types";

const defaultRule: CreateRuleInput = {
  min_age: 20,
  max_age: 60,
  region: "Casablanca-Settat",
  milieu: "Urbain",
  risk_level: "Low",
};

type SectionStatus = { variant: "success" | "error"; message: string } | null;

function CampaignRow({
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
      className={`w-full rounded-lg border p-3 text-left transition-all ${
        isSelected
          ? "border-sky-600 bg-sky-50 ring-2 ring-sky-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-slate-900">{campaign.name}</p>
          <p className="text-xs text-slate-500">ID: {campaign.id}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            campaign.status === "ACTIVE"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {campaign.status}
        </span>
      </div>
      {campaign.rules.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {campaign.rules.slice(0, 2).map((rule, idx) => (
            <span key={idx} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {rule.region}
            </span>
          ))}
          {campaign.rules.length > 2 && (
            <span className="text-[10px] text-slate-400">+{campaign.rules.length - 2}</span>
          )}
        </div>
      )}
    </button>
  );
}

export function AdminDashboard() {
  const campaignsQuery = useCampaigns();
  const createCampaignMutation = useCreateCampaign();

  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [ruleForm, setRuleForm] = useState<CreateRuleInput>(defaultRule);

  const [createStatus, setCreateStatus] = useState<SectionStatus>(null);
  const [ruleStatus, setRuleStatus] = useState<SectionStatus>(null);
  const [launchStatus, setLaunchStatus] = useState<SectionStatus>(null);
  const [previewStatus, setPreviewStatus] = useState<SectionStatus>(null);
  const [analyticsStatus, setAnalyticsStatus] = useState<SectionStatus>(null);
  const [analyticsLastUpdated, setAnalyticsLastUpdated] = useState<string | null>(null);
  const [isAutoRefreshingAnalytics, setIsAutoRefreshingAnalytics] = useState(false);
  const analyticsSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const campaigns = useMemo(() => campaignsQuery.data ?? [], [campaignsQuery.data]);
  const effectiveCampaignId = useMemo(() => {
    if (selectedCampaignId !== null) {
      return selectedCampaignId;
    }
    return campaigns.length > 0 ? campaigns[0].id : null;
  }, [campaigns, selectedCampaignId]);

  const campaignDetailQuery = useCampaign(effectiveCampaignId);
  const selectedCampaign: Campaign | null = campaignDetailQuery.data ?? null;

  const addRuleMutation = useAddRule(effectiveCampaignId);
  const launchCampaignMutation = useLaunchCampaign(effectiveCampaignId);
  const stratifyMutation = useStratifyAudience(effectiveCampaignId);

  const roiQuery = useRoi(effectiveCampaignId);
  const regionalQuery = useRegionalCoverage(effectiveCampaignId);

  const analyticsFetching = roiQuery.isFetching || regionalQuery.isFetching;

  function stopAnalyticsAutoRefresh() {
    if (analyticsSyncIntervalRef.current !== null) {
      clearInterval(analyticsSyncIntervalRef.current);
      analyticsSyncIntervalRef.current = null;
    }
    setIsAutoRefreshingAnalytics(false);
  }

  async function refreshAnalyticsNow() {
    const [roiResult, regionalResult] = await Promise.all([roiQuery.refetch(), regionalQuery.refetch()]);
    if (roiResult.error || regionalResult.error) {
      throw new Error("Analytics refresh failed. Please retry.");
    }
    setAnalyticsLastUpdated(new Date().toLocaleTimeString());
    return roiResult.data?.total_messages ?? 0;
  }

  async function handleManualAnalyticsRefresh() {
    setAnalyticsStatus(null);
    try {
      const totalMessages = await refreshAnalyticsNow();
      setAnalyticsStatus({
        variant: "success",
        message:
          totalMessages > 0
            ? "Analytics refreshed. Message activity visible."
            : "Analytics refreshed. No message activity yet.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh analytics";
      setAnalyticsStatus({ variant: "error", message });
    }
  }

  function startAnalyticsAutoRefresh() {
    if (effectiveCampaignId === null) {
      return;
    }

    stopAnalyticsAutoRefresh();
    setIsAutoRefreshingAnalytics(true);
    setAnalyticsStatus({
      variant: "success",
      message: "Syncing analytics every 5s while events process...",
    });

    let attempts = 0;
    const maxAttempts = 12;
    analyticsSyncIntervalRef.current = setInterval(() => {
      attempts += 1;
      void refreshAnalyticsNow()
        .then((totalMessages) => {
          if (totalMessages > 0) {
            setAnalyticsStatus({
              variant: "success",
              message: "Sync complete. Message activity started.",
            });
            stopAnalyticsAutoRefresh();
            return;
          }

          if (attempts >= maxAttempts) {
            setAnalyticsStatus({
              variant: "error",
              message: "Still processing after 60s. Use manual refresh.",
            });
            stopAnalyticsAutoRefresh();
          }
        })
        .catch(() => {
          if (attempts >= maxAttempts) {
            setAnalyticsStatus({
              variant: "error",
              message: "Auto-sync errors. Use manual refresh.",
            });
            stopAnalyticsAutoRefresh();
          }
        });
    }, 5000);
  }

  useEffect(() => stopAnalyticsAutoRefresh, []);

  async function handleCreateCampaign() {
    if (!newCampaignName.trim() || newCampaignName.trim().length < 3) {
      setCreateStatus({ variant: "error", message: "Campaign name must be at least 3 characters." });
      return;
    }
    setCreateStatus(null);
    try {
      const created = await createCampaignMutation.mutateAsync({ name: newCampaignName.trim() });
      setSelectedCampaignId(created.id);
      setNewCampaignName("");
      setCreateStatus({ variant: "success", message: `Campaign "${created.name}" created successfully.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create campaign";
      setCreateStatus({ variant: "error", message });
    }
  }

  async function handleAddRule() {
    setRuleStatus(null);
    try {
      await addRuleMutation.mutateAsync(ruleForm);
      setRuleStatus({ variant: "success", message: "Targeting rule added." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add rule";
      setRuleStatus({ variant: "error", message });
    }
  }

  async function handleLaunch() {
    setLaunchStatus(null);
    try {
      await launchCampaignMutation.mutateAsync();
      setLaunchStatus({ variant: "success", message: "Campaign launched and now ACTIVE." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to launch campaign";
      setLaunchStatus({ variant: "error", message });
    }
  }

  async function handlePreviewAudience() {
    setPreviewStatus(null);
    const rules = toRuleInputs(selectedCampaign);

    try {
      const result = await stratifyMutation.mutateAsync(rules);
      setPreviewStatus({
        variant: "success",
        message: `Audience preview: ${result.matched_count} patients matched.`,
      });
      startAnalyticsAutoRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to preview audience";
      setPreviewStatus({ variant: "error", message });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="space-y-6 lg:col-span-1">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Create Campaign</h2>
          <div className="mt-3 space-y-3">
            <input
              type="text"
              value={newCampaignName}
              onChange={(event) => setNewCampaignName(event.target.value)}
              placeholder="Campaign name"
              data-testid="campaign-name-input"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleCreateCampaign()}
              data-testid="create-campaign-button"
              disabled={createCampaignMutation.isPending || newCampaignName.trim().length < 3}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
            </button>
            {createStatus && (
              <StatusMessage
                variant={createStatus.variant}
                message={createStatus.message}
                testId="admin-status-create"
              />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Campaigns</h2>
            <span className="text-xs text-slate-500">{campaigns.length} total</span>
          </div>
          <div className="mt-3 max-h-[400px] space-y-2 overflow-y-auto">
            {campaignsQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : campaignsQuery.isError ? (
              <p className="text-sm text-red-600">
                Failed to load.{" "}
                <button onClick={() => void campaignsQuery.refetch()} className="underline">
                  Retry
                </button>
              </p>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-slate-500">No campaigns yet.</p>
            ) : (
              campaigns.map((campaign) => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  isSelected={campaign.id === effectiveCampaignId}
                  onSelect={() => setSelectedCampaignId(campaign.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <div className="space-y-6 lg:col-span-3">
        {selectedCampaign ? (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selectedCampaign.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">ID: {selectedCampaign.id} • {selectedCampaign.status}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    selectedCampaign.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {selectedCampaign.status}
                </span>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Targeting Rules</h3>
              <p className="mt-1 text-sm text-slate-500">Define who this campaign targets.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="space-y-1 text-xs text-slate-700">
                  Min Age
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={ruleForm.min_age}
                    onChange={(event) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        min_age: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-700">
                  Max Age
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={ruleForm.max_age}
                    onChange={(event) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        max_age: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </label>
                <label className="space-y-1 text-xs text-slate-700">
                  Region
                  <select
                    value={ruleForm.region}
                    onChange={(event) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        region: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  >
                    {MOROCCAN_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-700">
                  Milieu
                  <select
                    value={ruleForm.milieu}
                    onChange={(event) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        milieu: event.target.value as MilieuName,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  >
                    {MILIEUX.map((milieu) => (
                      <option key={milieu} value={milieu}>
                        {milieu}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs text-slate-700">
                  Risk
                  <select
                    value={ruleForm.risk_level}
                    onChange={(event) =>
                      setRuleForm((prev) => ({
                        ...prev,
                        risk_level: event.target.value as RiskLevelName,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-2 py-1.5"
                  >
                    {RISK_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleAddRule()}
                  data-testid="add-rule-button"
                  disabled={addRuleMutation.isPending || ruleForm.max_age < ruleForm.min_age}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-sky-300"
                >
                  {addRuleMutation.isPending ? "Adding..." : "Add Rule"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleLaunch()}
                  data-testid="launch-campaign-button"
                  disabled={launchCampaignMutation.isPending}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {launchCampaignMutation.isPending ? "Launching..." : "Launch Campaign"}
                </button>
                <button
                  type="button"
                  onClick={() => void handlePreviewAudience()}
                  data-testid="preview-audience-button"
                  disabled={stratifyMutation.isPending || (selectedCampaign.rules.length ?? 0) === 0}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300"
                >
                  {stratifyMutation.isPending ? "Previewing..." : "Preview Audience"}
                </button>
              </div>

              {(ruleStatus || launchStatus || previewStatus) && (
                <div className="mt-4 space-y-2">
                  {ruleStatus && <StatusMessage variant={ruleStatus.variant} message={ruleStatus.message} testId="admin-status-rule" />}
                  {launchStatus && <StatusMessage variant={launchStatus.variant} message={launchStatus.message} testId="admin-status-launch" />}
                  {previewStatus && <StatusMessage variant={previewStatus.variant} message={previewStatus.message} testId="admin-status-preview" />}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Campaign Metrics</h3>
                  <p className="mt-1 text-sm text-slate-500">Real-time ROI and engagement data.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Updated: {analyticsLastUpdated ?? "—"} • Auto: {isAutoRefreshingAnalytics ? "on" : "off"}
                  </span>
                  <button
                    type="button"
                    data-testid="refresh-analytics-button"
                    onClick={() => void handleManualAnalyticsRefresh()}
                    disabled={analyticsFetching}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    {analyticsFetching ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
              </div>

              {analyticsStatus && (
                <div className="mt-3">
                  <StatusMessage variant={analyticsStatus.variant} message={analyticsStatus.message} testId="admin-status-analytics" />
                </div>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <MetricCard title="Messages Sent" value={roiQuery.data?.total_messages ?? 0} testId="roi-total-messages" />
                <MetricCard title="Appointments" value={roiQuery.data?.total_bookings ?? 0} testId="roi-total-bookings" />
                <MetricCard title="Conversion" value={`${roiQuery.data?.conversion_rate ?? 0}%`} testId="roi-conversion-rate" />
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-medium text-slate-900">Regional Breakdown</h4>
                <div className="mt-3 h-64">
                  {(regionalQuery.data?.regions.length ?? 0) > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionalQuery.data?.regions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="region" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="total_messages" fill="#1d6f8a" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total_bookings" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-slate-500">Run audience preview to see regional data.</p>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 p-8">
            <p className="text-slate-500">Select a campaign from the list to manage it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
