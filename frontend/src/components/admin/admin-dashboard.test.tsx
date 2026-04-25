import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminDashboard } from "@/components/admin/admin-dashboard";

vi.mock("@/lib/api/client", () => ({
  api: {
    listCampaigns: vi.fn(),
    createCampaign: vi.fn(),
    getCampaign: vi.fn(),
    addRule: vi.fn(),
    launchCampaign: vi.fn(),
    stratifyAudience: vi.fn(),
    getRoi: vi.fn(),
    getRegionalCoverage: vi.fn(),
  },
}));

import { api } from "@/lib/api/client";

function renderAdmin() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminDashboard />
    </QueryClientProvider>,
  );
}

describe("AdminDashboard", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listCampaigns).mockResolvedValue([]);
    vi.mocked(api.getRoi).mockResolvedValue({
      campaign_id: 1,
      total_messages: 0,
      total_bookings: 0,
      conversion_rate: 0,
    });
    vi.mocked(api.getRegionalCoverage).mockResolvedValue({ campaign_id: 1, regions: [] });
  });

  it("creates a campaign and shows success status", async () => {
    const created = { id: 7, name: "My Campaign Name", status: "DRAFT" as const, rules: [] };
    vi.mocked(api.createCampaign).mockResolvedValue(created);
    vi.mocked(api.listCampaigns).mockResolvedValueOnce([]).mockResolvedValue([created]);
    vi.mocked(api.getCampaign).mockResolvedValue(created);

    renderAdmin();

    await waitFor(() => expect(api.listCampaigns).toHaveBeenCalled());

    fireEvent.change(screen.getByTestId("campaign-name-input"), { target: { value: "My Campaign Name" } });
    fireEvent.click(screen.getByTestId("create-campaign-button"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-status-create")).toHaveTextContent("created successfully");
    });
    expect(api.createCampaign).toHaveBeenCalledWith({ name: "My Campaign Name" });
  });
});