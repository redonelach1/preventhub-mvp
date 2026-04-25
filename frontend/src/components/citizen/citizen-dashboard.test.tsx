import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CitizenDashboard } from "@/components/citizen/citizen-dashboard";

vi.mock("@/lib/api/client", () => ({
  api: {
    listActiveCampaigns: vi.fn(),
    getPreference: vi.fn(),
    updatePreference: vi.fn(),
    trackClick: vi.fn(),
    trackAdherence: vi.fn(),
  },
}));

import { api } from "@/lib/api/client";

function renderCitizen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <CitizenDashboard />
    </QueryClientProvider>,
  );
}

describe("CitizenDashboard", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listActiveCampaigns).mockResolvedValue([
      { id: 1, name: "Flu drive", status: "ACTIVE", rules: [] },
    ]);
    vi.mocked(api.getPreference).mockResolvedValue({ patient_id: 1, channel: "SMS" });
  });

  it("updates communication preference and shows success status", async () => {
    vi.mocked(api.updatePreference).mockResolvedValue({ patient_id: 1, channel: "Push" });

    renderCitizen();

    await waitFor(() => expect(api.listActiveCampaigns).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("channel-push")).toBeInTheDocument());

    fireEvent.click(screen.getByTestId("channel-push"));

    await waitFor(() => {
      expect(screen.getByTestId("citizen-preference-status")).toHaveTextContent("Preference updated to Push");
    });
    expect(api.updatePreference).toHaveBeenCalledWith(1, "Push");
  });

  it("records a click against the top campaign", async () => {
    vi.mocked(api.trackClick).mockResolvedValue({
      id: 1,
      patient_id: 1,
      campaign_id: 1,
      action: "clicked",
    });

    renderCitizen();

    await waitFor(() => expect(api.listActiveCampaigns).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId("track-click-button")).toBeEnabled());

    fireEvent.click(screen.getByTestId("track-click-button"));

    await waitFor(() => {
      expect(screen.getByTestId("citizen-engagement-status")).toHaveTextContent("Tracked click for campaign #1");
    });
    expect(api.trackClick).toHaveBeenCalledWith(1, 1);
  });
});
