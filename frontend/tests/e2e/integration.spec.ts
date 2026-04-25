import { expect, test } from "@playwright/test";

test("admin workflow integrates with backend", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /public health operations/i })).toBeVisible();

  const uniqueCampaignName = `E2E Campaign ${Date.now()}`;
  await page.getByTestId("campaign-name-input").fill(uniqueCampaignName);
  await page.getByTestId("create-campaign-button").click();

  await expect(page.getByTestId("admin-status-create")).toContainText("created", { timeout: 15_000 });

  await page.getByTestId("add-rule-button").click();
  await expect(page.getByTestId("admin-status-rule")).toContainText("Targeting rule added", { timeout: 15_000 });

  await page.getByTestId("launch-campaign-button").click();
  await expect(page.getByTestId("admin-status-launch")).toContainText("ACTIVE", { timeout: 15_000 });

  await page.getByTestId("preview-audience-button").click();
  await expect(page.getByTestId("admin-status-preview")).toContainText("Audience preview complete", { timeout: 20_000 });
});

test("admin analytics reflect async pipeline after audience preview", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /public health operations/i })).toBeVisible();

  const uniqueCampaignName = `E2E Analytics ${Date.now()}`;
  await page.getByTestId("campaign-name-input").fill(uniqueCampaignName);
  await page.getByTestId("create-campaign-button").click();
  await expect(page.getByTestId("admin-status-create")).toContainText("created", { timeout: 15_000 });

  await page.getByTestId("add-rule-button").click();
  await expect(page.getByTestId("admin-status-rule")).toContainText("Targeting rule added", { timeout: 15_000 });

  await page.getByTestId("launch-campaign-button").click();
  await expect(page.getByTestId("admin-status-launch")).toContainText("ACTIVE", { timeout: 15_000 });

  await page.getByTestId("preview-audience-button").click();
  await expect(page.getByTestId("admin-status-preview")).toContainText("Audience preview complete", { timeout: 20_000 });

  await expect
    .poll(
      async () => {
        const refresh = page.getByTestId("refresh-analytics-button");
        if (await refresh.isEnabled()) {
          await refresh.click();
        }
        const raw = await page.getByTestId("roi-total-messages").textContent();
        return Number(raw?.trim() ?? 0);
      },
      { timeout: 120_000 },
    )
    .toBeGreaterThan(0);

  const refresh = page.getByTestId("refresh-analytics-button");
  await expect.poll(async () => refresh.isEnabled(), { timeout: 30_000 }).toBe(true);
  await refresh.click();
  await expect(page.getByTestId("regional-chart")).toBeVisible({ timeout: 30_000 });
});

test("citizen preference and engagement integrate with backend", async ({ page }) => {
  await page.goto("/citizen");
  await expect(page.getByRole("heading", { name: /your prevention dashboard/i })).toBeVisible();

  await page.getByTestId("citizen-patient-id-input").fill("1");
  await page.getByTestId("channel-push").click();
  await expect(page.getByTestId("citizen-preference-status")).toContainText("Preference updated to Push", {
    timeout: 15_000,
  });

  await page.getByTestId("track-click-button").click();
  await expect(page.getByTestId("citizen-engagement-status")).toContainText("Tracked click", { timeout: 15_000 });
});
