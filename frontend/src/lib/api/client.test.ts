import { api } from "@/lib/api/client";
import { describe, expect, it, vi } from "vitest";

describe("api client", () => {
  it("builds active campaign query params correctly", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await api.listActiveCampaigns({
      age: 43,
      region: "Casablanca-Settat",
      milieu: "Urbain",
      risk_level: "Low",
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/campaigns/active?age=43&region=Casablanca-Settat&milieu=Urbain&risk_level=Low");

    fetchMock.mockRestore();
  });
});
