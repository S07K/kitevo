import { test, expect } from "@playwright/test";

test.describe("Home / Landing", () => {
  test("landing page loads and shows headline", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("link-in-bio");
    await expect(page.getByText("Reimagined as a pitch deck")).toBeVisible();
  });

  test("Start Building links to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Start Building" }).click();
    await expect(page).toHaveURL(/\/dashboard|\/login/);
  });

  test("View Demo links to demo kit", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "View Demo" }).click();
    await expect(page).toHaveURL(/\/kit\/demo/);
  });

  test("nav has Home, Pricing, Get Started", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Pricing" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Get Started" }).first()).toBeVisible();
  });
});
