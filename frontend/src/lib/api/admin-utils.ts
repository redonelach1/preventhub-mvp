import type { Campaign, CreateRuleInput } from "@/lib/api/types";

export function toRuleInputs(campaign: Campaign | null): CreateRuleInput[] {
  if (!campaign) {
    return [];
  }

  return campaign.rules.map((rule) => ({
    min_age: rule.min_age,
    max_age: rule.max_age,
    region: rule.region,
    milieu: rule.milieu,
    risk_level: rule.risk_level,
  }));
}
