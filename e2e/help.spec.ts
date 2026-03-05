import { test, expect } from "@playwright/test";

test.describe("Help", () => {
  test("Instagram help page loads", async ({ page }) => {
    await page.goto("/help/instagram");
    await expect(page).toHaveURL(/\/help\/instagram/);
    await expect(
      page.getByRole("heading", { name: /connect instagram|help/i })
    ).toBeVisible({ timeout: 5000 });
  });
});
