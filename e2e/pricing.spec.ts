import { test, expect } from "@playwright/test";

test.describe("Pricing", () => {
  test("pricing page loads and shows plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Starter", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pro", level: 2 })).toBeVisible();
  });

  test("when already subscribed, shows manage subscription instead of plan buttons", async ({
    page,
  }) => {
    await page.route("**/api/subscription-status", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            hasSubscription: true,
            tierName: "Pro",
            allowedKits: 3,
            tierId: "pro",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/pricing");
    await expect(page.getByText("You're already subscribed")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Current plan: Pro")).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Dashboard" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage subscription" })).toBeVisible();
  });
});
