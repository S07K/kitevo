/**
 * Hermetic test environment.
 *
 * Tests must not depend on a developer's .env.local (or hit real services). Some modules
 * construct clients at import time (e.g. `new Resend(process.env.RESEND_API_KEY)` in
 * lib/email.ts, Prisma reading DATABASE_URL), which throws when the var is missing.
 * These are dummy values — network calls are mocked in the tests themselves.
 */

process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
// schema.prisma declares directUrl; Prisma CLI reads it for schema work.
process.env.DIRECT_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.RESEND_API_KEY ||= "re_test_key";
process.env.RESEND_FROM_EMAIL ||= "Kitevo <test@example.com>";
process.env.STRIPE_SECRET_KEY ||= "sk_test_fake";
process.env.STRIPE_WEBHOOK_SECRET ||= "whsec_test_fake";
process.env.NEXTAUTH_SECRET ||= "test-secret-at-least-32-characters-long";
process.env.NEXTAUTH_URL ||= "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:3000";
process.env.SUBSCRIPTION_COOKIE_SECRET ||= "test-cookie-secret-at-least-32-chars";

/**
 * Rate-limit windows are process-local, so they leak between tests in the same file: a
 * route test that runs enough requests would start getting 429s from an earlier test's
 * counter rather than from what it is asserting. Cleared before every test so each starts
 * from an empty bucket.
 */
import { beforeEach } from "vitest";
import { __resetRateLimits } from "./lib/rate-limit";

beforeEach(() => __resetRateLimits());
