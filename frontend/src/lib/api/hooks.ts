"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { ActiveCampaignQuery, ChannelName } from "@/lib/api/types";
import type { CreateCampaignInput, CreateRuleInput } from "@/lib/api/types";

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: api.listCampaigns,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCampaignInput) => api.createCampaign(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useAddRule(campaignId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRuleInput) => {
      if (campaignId === null) {
        throw new Error("Campaign id is required before adding a rule");
      }
      return api.addRule(campaignId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      if (campaignId !== null) {
        void queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      }
    },
  });
}

export function useLaunchCampaign(campaignId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (campaignId === null) {
        throw new Error("Campaign id is required before launch");
      }
      return api.launchCampaign(campaignId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      void queryClient.invalidateQueries({ queryKey: ["campaigns", "active"] });
      if (campaignId !== null) {
        void queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
      }
    },
  });
}

export function useStratifyAudience(campaignId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rules: CreateRuleInput[]) => {
      if (campaignId === null) {
        throw new Error("Campaign id is required before audience preview");
      }
      if (rules.length === 0) {
        throw new Error("At least one targeting rule is required");
      }
      return api.stratifyAudience(campaignId, rules);
    },
    onSuccess: () => {
      if (campaignId !== null) {
        void queryClient.invalidateQueries({ queryKey: ["analytics", "roi", campaignId] });
        void queryClient.invalidateQueries({ queryKey: ["analytics", "regional", campaignId] });
      }
    },
  });
}

export function useCampaign(campaignId: number | null) {
  return useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => api.getCampaign(campaignId as number),
    enabled: campaignId !== null,
  });
}

export function useActiveCampaigns(query: ActiveCampaignQuery) {
  return useQuery({
    queryKey: ["campaigns", "active", query],
    queryFn: () => api.listActiveCampaigns(query),
  });
}

export function useRoi(campaignId: number | null) {
  return useQuery({
    queryKey: ["analytics", "roi", campaignId],
    queryFn: () => api.getRoi(campaignId as number),
    enabled: campaignId !== null,
  });
}

export function useRegionalCoverage(campaignId: number | null) {
  return useQuery({
    queryKey: ["analytics", "regional", campaignId],
    queryFn: () => api.getRegionalCoverage(campaignId as number),
    enabled: campaignId !== null,
  });
}

export function usePreference(patientId: number | null) {
  return useQuery({
    queryKey: ["communication", "preference", patientId],
    queryFn: () => api.getPreference(patientId as number),
    enabled: patientId !== null,
  });
}

export function useUpdatePreference(patientId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (channel: ChannelName) => {
      if (patientId === null) {
        throw new Error("Patient id is required before updating preference");
      }
      return api.updatePreference(patientId, channel);
    },
    onSuccess: () => {
      if (patientId !== null) {
        void queryClient.invalidateQueries({ queryKey: ["communication", "preference", patientId] });
      }
    },
  });
}


export function useActivity(patientId: number | null) {
  return useQuery({
    queryKey: ["analytics", "activity", patientId],
    queryFn: () => api.getActivity(patientId as number),
    enabled: patientId !== null,
  });
}


export function useMessageTemplates() {
  return useQuery({
    queryKey: ["communication", "templates"],
    queryFn: api.listTemplates,
  });
}
