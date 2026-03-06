import { test, expect } from "@playwright/test";

test.describe("Dashboard Instagram connection", () => {
  test("when not connected, shows Connect Instagram", async ({ page }) => {
    const email = `e2e-ig-${Date.now()}@example.com`;
    const password = "TestPass123!";

    await page.goto("/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /create account|sign up/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10000 });

    if (await page.getByRole("button", { name: /go to dashboard/i }).isVisible()) {
      await page.getByRole("button", { name: /go to dashboard/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    }

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Connect Instagram" })).toBeVisible();
  });

  test("when connected, shows Disconnect and clicking it shows Connect Instagram", async ({
    page,
  }) => {
    const email = `e2e-ig2-${Date.now()}@example.com`;
    const password = "TestPass123!";

    await page.goto("/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /create account|sign up/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10000 });

    if (await page.getByRole("button", { name: /go to dashboard/i }).isVisible()) {
      await page.getByRole("button", { name: /go to dashboard/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    }

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Mock Instagram status as connected and disconnect API as success
    await page.route("**/api/instagram/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: true }),
      });
    });
    await page.route("**/api/instagram/disconnect", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.continue();
      }
    });

    await page.reload();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Connected")).toBeVisible();
    await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();

    await page.getByRole("button", { name: "Disconnect" }).click();

    await expect(page.getByRole("link", { name: "Connect Instagram" })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Connected")).not.toBeVisible();
  });
});
