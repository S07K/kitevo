import { test, expect } from "@playwright/test";

test.describe("Signup", () => {
  test("signup page loads and has form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create account|sign up/i })).toBeVisible();
  });

  test("Log in link goes to login page", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("link", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
