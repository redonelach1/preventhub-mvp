import { describe, expect, it } from "vitest";

import { toRuleInputs } from "@/lib/api/admin-utils";
import type { Campaign } from "@/lib/api/types";

describe("admin utils", () => {
  it("returns empty rules for null campaign", () => {
    expect(toRuleInputs(null)).toEqual([]);
  });

  it("maps campaign rules to stratification input shape", () => {
    const campaign: Campaign = {
      id: 1,
      name: "Campaign",
      status: "ACTIVE",
      rules: [
        {
          id: 10,
          campaign_id: 1,
          min_age: 20,
          max_age: 60,
          region: "Casablanca-Settat",
          milieu: "Urbain",
          risk_level: "Low",
        },
      ],
    };

    expect(toRuleInputs(campaign)).toEqual([
      {
        min_age: 20,
        max_age: 60,
        region: "Casablanca-Settat",
        milieu: "Urbain",
        risk_level: "Low",
      },
    ]);
  });
});
