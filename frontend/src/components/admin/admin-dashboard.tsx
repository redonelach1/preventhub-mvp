"use client";

import { useMemo, useState } from "react";
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

function StatusLine({ status, testId }: { status: SectionStatus; testId: string }) {
  if (!status) {
    return null;
  }
  const styles =
    status.variant === "success"
      ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border border-red-200 bg-red-50 text-red-900";
  return (
    <p data-testid={testId} className={`mt-3 rounded-lg px-3 py-2 text-sm ${styles}`} role="status">
      {status.message}
    </p>
  );
}

export function AdminDashboard() {
  const campaignsQuery = useCampaigns();
  const createCampaignMutation = useCreateCampaign();

  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [newCampaignName, setNewCampaignName] = useState("Frontend Readiness Campaign");
  const [ruleForm, setRuleForm] = useState<CreateRuleInput>(defaultRule);

  const [createStatus, setCreateStatus] = useState<SectionStatus>(null);
  const [ruleStatus, setRuleStatus] = useState<SectionStatus>(null);
  const [launchStatus, setLaunchStatus] = useState<SectionStatus>(null);
  const [previewStatus, setPreviewStatus] = useState<SectionStatus>(null);

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

  async function handleCreateCampaign() {
    setCreateStatus(null);
    try {
      const created = await createCampaignMutation.mutateAsync({ name: newCampaignName.trim() });
      setSelectedCampaignId(created.id);
      setCreateStatus({ variant: "success", message: `Campaign #${created.id} created.` });
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
        message: `Audience preview complete: ${result.matched_count} matched patients. Analytics will update as messages are processed.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to preview audience";
      setPreviewStatus({ variant: "error", message });
    }
  }

  function refreshAnalytics() {
    void roiQuery.refetch();
    void regionalQuery.refetch();
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create Campaign</h2>
          <p className="mt-1 text-sm text-slate-600">Create a campaign, then select it to add rules and launch.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newCampaignName}
              onChange={(event) => setNewCampaignName(event.target.value)}
              placeholder="Campaign name"
              data-testid="campaign-name-input"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleCreateCampaign()}
              data-testid="create-campaign-button"
              disabled={createCampaignMutation.isPending || newCampaignName.trim().length < 3}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {createCampaignMutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
          <StatusLine status={createStatus} testId="admin-status-create" />
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Selected Campaign</h2>
          {campaignDetailQuery.isLoading ? (
            <p className="mt-3 text-sm text-slate-600">Loading selected campaign...</p>
          ) : campaignDetailQuery.isError ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              Failed to load campaign details.{" "}
              <button
                type="button"
                onClick={() => void campaignDetailQuery.refetch()}
                className="font-medium text-sky-800 underline hover:text-sky-600"
              >
                Retry
              </button>
            </p>
          ) : selectedCampaign ? (
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>
                <span className="font-semibold">ID:</span> {selectedCampaign.id}
              </p>
              <p>
                <span className="font-semibold">Name:</span> {selectedCampaign.name}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {selectedCampaign.status}
              </p>
              <p>
                <span className="font-semibold">Rules:</span> {selectedCampaign.rules.length}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No campaign selected yet.</p>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Campaign History</h2>
        <p className="mt-1 text-sm text-slate-600">Select a campaign to inspect details, ROI, and regional coverage.</p>

        {campaignsQuery.isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading campaigns...</p>
        ) : campaignsQuery.isError ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            Failed to load campaigns.{" "}
            <button
              type="button"
              onClick={() => void campaignsQuery.refetch()}
              className="font-medium text-sky-800 underline hover:text-sky-600"
            >
              Retry
            </button>
          </p>
        ) : campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No campaigns found yet.</p>
        ) : (
          <div className="mt-4 grid gap-2">
            {campaigns.slice(0, 10).map((campaign) => {
              const isSelected = campaign.id === effectiveCampaignId;
              return (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-sky-600 bg-sky-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-slate-900">
                      #{campaign.id} - {campaign.name}
                    </span>
                    <span className="rounded-full bg-slate-900 px-2 py-1 text-xs text-white">{campaign.status}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Targeting Rule Builder</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1 text-sm text-slate-700">
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
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
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
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            Region
            <select
              value={ruleForm.region}
              onChange={(event) =>
                setRuleForm((prev) => ({
                  ...prev,
                  region: event.target.value,
                }))
              }
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
              value={ruleForm.milieu}
              onChange={(event) =>
                setRuleForm((prev) => ({
                  ...prev,
                  milieu: event.target.value as MilieuName,
                }))
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
              value={ruleForm.risk_level}
              onChange={(event) =>
                setRuleForm((prev) => ({
                  ...prev,
                  risk_level: event.target.value as RiskLevelName,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {RISK_LEVELS.map((riskLevel) => (
                <option key={riskLevel} value={riskLevel}>
                  {riskLevel}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleAddRule()}
            data-testid="add-rule-button"
            disabled={effectiveCampaignId === null || addRuleMutation.isPending || ruleForm.max_age < ruleForm.min_age}
            className="rounded-full bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {addRuleMutation.isPending ? "Adding Rule..." : "Add Rule"}
          </button>
          <button
            type="button"
            onClick={() => void handleLaunch()}
            data-testid="launch-campaign-button"
            disabled={effectiveCampaignId === null || launchCampaignMutation.isPending}
            className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {launchCampaignMutation.isPending ? "Launching..." : "Launch Campaign"}
          </button>
          <button
            type="button"
            onClick={() => void handlePreviewAudience()}
            data-testid="preview-audience-button"
            disabled={
              effectiveCampaignId === null || stratifyMutation.isPending || (selectedCampaign?.rules.length ?? 0) === 0
            }
            className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300"
          >
            {stratifyMutation.isPending ? "Previewing..." : "Preview Audience"}
          </button>
        </div>

        <StatusLine status={ruleStatus} testId="admin-status-rule" />
        <StatusLine status={launchStatus} testId="admin-status-launch" />
        <StatusLine status={previewStatus} testId="admin-status-preview" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Impact metrics</h2>
            <p className="mt-1 text-sm text-slate-600">ROI from analytics-service (updates as Kafka events land).</p>
          </div>
          <button
            type="button"
            data-testid="refresh-analytics-button"
            onClick={() => refreshAnalytics()}
            disabled={effectiveCampaignId === null || analyticsFetching}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {analyticsFetching ? "Refreshing..." : "Refresh metrics"}
          </button>
        </div>

        {effectiveCampaignId === null ? (
          <p className="mt-4 text-sm text-slate-600">Select a campaign to load ROI.</p>
        ) : roiQuery.isLoading && !roiQuery.data ? (
          <p className="mt-4 text-sm text-slate-600">Loading ROI...</p>
        ) : roiQuery.isError ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            Failed to load ROI.{" "}
            <button
              type="button"
              onClick={() => void roiQuery.refetch()}
              className="font-medium text-sky-800 underline hover:text-sky-600"
            >
              Retry
            </button>
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 shadow-inner">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Messages</p>
              <p data-testid="roi-total-messages" className="mt-2 text-3xl font-semibold text-slate-900">
                {roiQuery.data?.total_messages ?? 0}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 shadow-inner">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total Bookings</p>
              <p data-testid="roi-total-bookings" className="mt-2 text-3xl font-semibold text-slate-900">
                {roiQuery.data?.total_bookings ?? 0}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 shadow-inner">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Conversion Rate</p>
              <p data-testid="roi-conversion-rate" className="mt-2 text-3xl font-semibold text-slate-900">
                {roiQuery.data?.conversion_rate ?? 0}%
              </p>
            </article>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Regional Coverage</h2>
        <p className="mt-1 text-sm text-slate-600">Messages and bookings by patient region.</p>

        {effectiveCampaignId === null ? (
          <p className="mt-4 text-sm text-slate-600">Select a campaign to load regional coverage.</p>
        ) : regionalQuery.isLoading && !regionalQuery.data ? (
          <p className="mt-4 text-sm text-slate-600">Loading regional metrics...</p>
        ) : regionalQuery.isError ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            Failed to load regional metrics.{" "}
            <button
              type="button"
              onClick={() => void regionalQuery.refetch()}
              className="font-medium text-sky-800 underline hover:text-sky-600"
            >
              Retry
            </button>
          </p>
        ) : (regionalQuery.data?.regions.length ?? 0) === 0 ? (
          <p data-testid="regional-empty" className="mt-4 text-sm text-slate-600">
            No regional data yet for this campaign. Run an audience preview and refresh metrics after messages are processed.
          </p>
        ) : (
          <div className="mt-4 h-72 w-full" data-testid="regional-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalQuery.data?.regions} margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_messages" fill="#1d6f8a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="total_bookings" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
