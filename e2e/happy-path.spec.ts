import { test, expect } from "@playwright/test";

test.describe("Happy path: signup → login → onboarding → dashboard", () => {
  test("new user can sign up, log in, complete onboarding, and reach dashboard", async ({
    page,
  }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "TestPass123!";

    // Sign up
    await page.goto("/signup");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /create account|sign up/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Log in (callbackUrl is /dashboard; dashboard then redirects new users to /onboarding)
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/, { timeout: 10000 });
    await expect(page.getByRole("heading", { name: /welcome to media kit pro/i })).toBeVisible({
      timeout: 10000,
    });
    await expect(page).toHaveURL(/\/onboarding/);

    // Onboarding: welcome and steps visible
    await expect(page.getByRole("heading", { name: /welcome to media kit pro/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /go to dashboard/i })).toBeVisible();

    // Complete onboarding
    await page.getByRole("button", { name: /go to dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Dashboard loads (may show subscribe CTA or profile section)
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
