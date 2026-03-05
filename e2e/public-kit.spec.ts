import { test, expect } from "@playwright/test";

test.describe("Public kit page", () => {
  test("demo kit page loads and shows content", async ({ page }) => {
    await page.goto("/kit/demo");
    await expect(page).toHaveURL(/\/kit\/demo/);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("unknown slug returns 404", async ({ page }) => {
    const res = await page.goto("/kit/this-slug-does-not-exist-12345");
    expect(res?.status()).toBe(404);
  });
});
