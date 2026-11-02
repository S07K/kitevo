/**
 * Referral program: attribution, commission ledger, balances, and (manual) payouts.
 *
 * Flow: a visitor lands with `?ref=CODE` → ReferralCapture sets the REF_COOKIE → signup
 * (email or Google) calls attributeReferral → every successful payment by the referred
 * user (payment.succeeded webhook) creates a ReferralCommission → after the hold it is
 * "available" → the admin pays it (PayPal/Wise/bank, by hand for now) and records the
 * payout on /admin/payouts, which marks those commissions paid.
 *
 * Money is integers in minor units (cents) of the provider's settlement currency.
 * Refunds reverse an unpaid commission, or claw back a paid one with a negative row that
 * nets against the next payout.
 */

import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/token-crypto";

import { REFERRAL_TERMS } from "@/lib/referral-terms";
export { REFERRAL_TERMS };

export { REF_COOKIE, REF_COOKIE_MAX_AGE } from "@/lib/referral-cookie";

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o/1/l/i
const CODE_RE = /^[a-z0-9]{4,32}$/;

export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.trim().toLowerCase();
  return CODE_RE.test(code) ? code : null;
}

function generateCode(len = 7): string {
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** The user's referral code, creating one on first use. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (existing?.referralCode) return existing.referralCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    try {
      const res = await prisma.user.updateMany({ where: { id: userId, referralCode: null }, data: { referralCode: code } });
      if (res.count === 1) return code;
      // Set concurrently by another request (or the user doesn't exist): read it back.
      const again = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
      if (again?.referralCode) return again.referralCode;
      throw new Error("User not found");
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") continue; // code collision — try another
      throw e;
    }
  }
  throw new Error("Could not allocate a referral code");
}

/**
 * Canonical form of an email for self-referral checks: lowercase, `+tag` removed, and
 * dots removed for Gmail (which ignores them).
 */
export function emailFingerprint(email: string): string {
  const [local = "", domain = ""] = email.trim().toLowerCase().split("@");
  let l = local.split("+")[0];
  const d = domain === "googlemail.com" ? "gmail.com" : domain;
  if (d === "gmail.com") l = l.replace(/\./g, "");
  return `${l}@${d}`;
}

/**
 * Link a brand-new user to the referrer whose code they arrived with. No-op (returns
 * false) for unknown codes, self-referrals, or a user who is already attributed.
 */
export async function attributeReferral(params: {
  newUserId: string;
  newUserEmail: string;
  code: string | null | undefined;
}): Promise<boolean> {
  const code = normalizeReferralCode(params.code);
  if (!code) return false;
  try {
    const referrer = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, email: true } });
    if (!referrer || referrer.id === params.newUserId) return false;
    if (emailFingerprint(referrer.email) === emailFingerprint(params.newUserEmail)) return false;
    const res = await prisma.user.updateMany({
      where: { id: params.newUserId, referredById: null },
      data: { referredById: referrer.id, referredAt: new Date() },
    });
    return res.count === 1;
  } catch (e) {
    console.error("[referrals] attribution failed:", e);
    return false;
  }
}

export function commissionFor(baseAmount: number): number {
  return Math.floor((Math.max(0, baseAmount) * REFERRAL_TERMS.rateBps) / 10000);
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}
function addMonths(d: Date, months: number) {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

export type CommissionResult =
  | "created"
  | "duplicate"
  | "no_user"
  | "not_referred"
  | "self"
  | "window_over"
  | "zero";

/** Record the commission for one succeeded payment. Idempotent per paymentId. */
export async function recordCommissionForPayment(p: {
  paymentId: string;
  customerId: string | null;
  userId: string | null;
  amount: number;
  currency: string;
  now?: Date;
}): Promise<CommissionResult> {
  const now = p.now ?? new Date();
  const payer = p.userId
    ? await prisma.user.findUnique({
        where: { id: p.userId },
        select: { id: true, referredById: true, stripeCustomerId: true },
      })
    : p.customerId
      ? await prisma.user.findFirst({
          where: { stripeCustomerId: p.customerId },
          select: { id: true, referredById: true, stripeCustomerId: true },
        })
      : null;
  if (!payer) return "no_user";
  if (!payer.referredById) return "not_referred";

  const referrer = await prisma.user.findUnique({
    where: { id: payer.referredById },
    select: { id: true, stripeCustomerId: true },
  });
  if (!referrer) return "not_referred";
  // Same paying customer on both sides = paying yourself a commission.
  const payerCustomer = p.customerId ?? payer.stripeCustomerId;
  if (payerCustomer && referrer.stripeCustomerId === payerCustomer) return "self";

  const first = await prisma.referralCommission.findFirst({
    where: { referredUserId: payer.id, amount: { gt: 0 } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (first && now > addMonths(first.createdAt, REFERRAL_TERMS.months)) return "window_over";

  const amount = commissionFor(p.amount);
  if (amount <= 0) return "zero";

  const res = await prisma.referralCommission.createMany({
    data: [
      {
        referrerId: referrer.id,
        referredUserId: payer.id,
        paymentId: p.paymentId,
        baseAmount: p.amount,
        amount,
        currency: p.currency.toUpperCase(),
        availableAt: addDays(now, REFERRAL_TERMS.holdDays),
      },
    ],
    skipDuplicates: true, // webhook retries
  });
  return res.count === 1 ? "created" : "duplicate";
}

/**
 * Apply a refund. Unpaid commission: shrink it (partial) or reverse it (full). Already
 * paid: add a negative clawback row that nets against the referrer's next payout.
 * `refundAmount` null = full refund.
 */
export async function applyRefundToCommission(p: {
  paymentId: string;
  refundId: string;
  refundAmount: number | null;
  now?: Date;
}): Promise<"reversed" | "reduced" | "clawback" | "none"> {
  const now = p.now ?? new Date();
  const c = await prisma.referralCommission.findUnique({ where: { paymentId: p.paymentId } });
  if (!c || c.status === "reversed" || c.amount <= 0) return "none";

  const refunded = p.refundAmount == null ? c.baseAmount : Math.min(c.baseAmount, p.refundAmount);
  const newBase = c.baseAmount - refunded;
  const newAmount = commissionFor(newBase);
  const delta = c.amount - newAmount; // commission to take back
  if (delta <= 0) return "none";

  if (c.status === "pending") {
    await prisma.referralCommission.update({
      where: { id: c.id },
      data: newAmount > 0
        ? { baseAmount: newBase, amount: newAmount }
        : { status: "reversed", reversedAt: now },
    });
    return newAmount > 0 ? "reduced" : "reversed";
  }

  await prisma.referralCommission.createMany({
    data: [
      {
        referrerId: c.referrerId,
        referredUserId: c.referredUserId,
        paymentId: `${c.paymentId}:refund:${p.refundId}`,
        baseAmount: -refunded,
        amount: -delta,
        currency: c.currency,
        availableAt: now, // nets against the very next payout
      },
    ],
    skipDuplicates: true,
  });
  return "clawback";
}

export type CurrencyTotals = Record<string, number>;

export type ReferralSummary = {
  code: string;
  terms: typeof REFERRAL_TERMS;
  referredCount: number;
  payingCount: number;
  pending: CurrencyTotals;
  available: CurrencyTotals;
  paid: CurrencyTotals;
  recent: Array<{ id: string; amount: number; currency: string; status: string; availableAt: string; createdAt: string }>;
  payouts: Array<{ id: string; amount: number; currency: string; method: string; reference: string; paidAt: string }>;
};

function bump(t: CurrencyTotals, cur: string, n: number) {
  t[cur] = (t[cur] ?? 0) + n;
}

/** Everything the creator's "Invite & earn" page shows. */
export async function getReferralSummary(userId: string, now = new Date()): Promise<ReferralSummary> {
  const code = await ensureReferralCode(userId);
  const [referredCount, commissions, payouts] = await Promise.all([
    prisma.user.count({ where: { referredById: userId } }),
    prisma.referralCommission.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, currency: true, status: true, availableAt: true, createdAt: true, referredUserId: true },
    }),
    prisma.referralPayout.findMany({
      where: { referrerId: userId },
      orderBy: { paidAt: "desc" },
      select: { id: true, amount: true, currency: true, method: true, reference: true, paidAt: true },
    }),
  ]);

  const pending: CurrencyTotals = {};
  const available: CurrencyTotals = {};
  const paid: CurrencyTotals = {};
  const paying = new Set<string>();
  for (const c of commissions) {
    if (c.amount > 0 && c.status !== "reversed") paying.add(c.referredUserId);
    if (c.status === "paid") bump(paid, c.currency, c.amount);
    else if (c.status === "pending") bump(c.availableAt <= now ? available : pending, c.currency, c.amount);
  }

  return {
    code,
    terms: REFERRAL_TERMS,
    referredCount,
    payingCount: paying.size,
    pending,
    available,
    paid,
    recent: commissions.slice(0, 20).map((c) => ({
      id: c.id,
      amount: c.amount,
      currency: c.currency,
      status: c.status === "pending" && c.availableAt <= now ? "available" : c.status,
      availableAt: c.availableAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({ ...p, paidAt: p.paidAt.toISOString() })),
  };
}

// ─── Payout details ──────────────────────────────────────────────────────────

export const PAYOUT_METHODS = ["paypal", "wise", "bank"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export type PayoutProfileInput = {
  method: PayoutMethod;
  destination: string;
  legalName: string;
  country: string;
  taxId?: string | null;
};

export type PayoutProfileView = Omit<PayoutProfileInput, "taxId"> & { taxId: string | null; updatedAt: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Structured bank details. Stored (encrypted) as JSON in PayoutProfile.destination. */
export type BankDetails = {
  accountHolder: string;
  accountNumber: string; // account number or IBAN
  bankName: string;
  swift: string; // SWIFT/BIC
  routing?: string; // routing / sort code / IFSC / BSB — where the country uses one
};

const clean = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

export function parseBankDetails(destination: string): BankDetails | null {
  try {
    const v = JSON.parse(destination) as BankDetails;
    return v && typeof v === "object" && typeof v.accountNumber === "string" ? v : null;
  } catch {
    return null;
  }
}

/** Human-readable destination, one field per line (admin payouts page). */
export function formatDestination(method: string, destination: string): string {
  if (method !== "bank") return destination;
  const b = parseBankDetails(destination);
  if (!b) return destination; // legacy free text
  return [
    `Account holder: ${b.accountHolder}`,
    `Account / IBAN: ${b.accountNumber}`,
    `Bank: ${b.bankName}`,
    `SWIFT/BIC: ${b.swift}`,
    b.routing ? `Routing / sort / IFSC: ${b.routing}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Validate user input. Returns the cleaned profile or an error message. */
export function validatePayoutProfile(raw: unknown): { ok: true; value: PayoutProfileInput } | { ok: false; error: string } {
  const b = (raw ?? {}) as Record<string, unknown>;
  const method = b.method as PayoutMethod;
  if (!PAYOUT_METHODS.includes(method)) return { ok: false, error: "Choose PayPal, Wise or bank transfer." };
  let destination = "";
  if (method === "paypal" || method === "wise") {
    destination = clean(b.destination, 254).toLowerCase();
    if (!EMAIL_RE.test(destination)) {
      return { ok: false, error: `Enter the email address on your ${method === "paypal" ? "PayPal" : "Wise"} account.` };
    }
  } else {
    const raw = (b.bank ?? {}) as Record<string, unknown>;
    const bank: BankDetails = {
      accountHolder: clean(raw.accountHolder),
      accountNumber: clean(raw.accountNumber, 64).replace(/\s/g, "").toUpperCase(),
      bankName: clean(raw.bankName),
      swift: clean(raw.swift, 11).replace(/\s/g, "").toUpperCase(),
      routing: clean(raw.routing, 32) || undefined,
    };
    if (bank.accountHolder.length < 2) return { ok: false, error: "Enter the account holder's name." };
    if (!/^[A-Z0-9]{5,34}$/.test(bank.accountNumber)) return { ok: false, error: "Enter a valid account number or IBAN." };
    if (bank.bankName.length < 2) return { ok: false, error: "Enter your bank's name." };
    if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bank.swift)) return { ok: false, error: "Enter a valid 8 or 11 character SWIFT/BIC code." };
    destination = JSON.stringify(bank);
  }
  const legalName = typeof b.legalName === "string" ? b.legalName.trim() : "";
  if (legalName.length < 2 || legalName.length > 200) return { ok: false, error: "Enter your full legal name." };
  const country = typeof b.country === "string" ? b.country.trim().toUpperCase() : "";
  if (!/^[A-Z]{2}$/.test(country)) return { ok: false, error: "Choose your country." };
  const taxId = typeof b.taxId === "string" && b.taxId.trim() ? b.taxId.trim().slice(0, 64) : null;
  return { ok: true, value: { method, destination, legalName, country, taxId } };
}

export async function savePayoutProfile(userId: string, v: PayoutProfileInput): Promise<void> {
  const data = {
    method: v.method,
    destination: encryptToken(v.destination),
    legalName: v.legalName,
    country: v.country,
    taxId: encryptToken(v.taxId ?? null),
  };
  await prisma.payoutProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}

export async function getPayoutProfile(userId: string): Promise<PayoutProfileView | null> {
  const p = await prisma.payoutProfile.findUnique({ where: { userId } });
  if (!p) return null;
  return {
    method: p.method as PayoutMethod,
    destination: decryptToken(p.destination) ?? "",
    legalName: p.legalName,
    country: p.country,
    taxId: decryptToken(p.taxId),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ─── Admin: what's due, and recording payouts ────────────────────────────────

export type DueRow = {
  referrerId: string;
  name: string | null;
  email: string;
  currency: string;
  amount: number;
  commissionCount: number;
  meetsMinimum: boolean;
  profile: PayoutProfileView | null;
};

export function minPayoutFor(currency: string): number {
  return REFERRAL_TERMS.minPayout[currency] ?? REFERRAL_TERMS.defaultMinPayout;
}

/** Available balances per referrer + currency, with payout details. Includes rows below the minimum (flagged). */
export async function getDuePayouts(now = new Date()): Promise<DueRow[]> {
  const grouped = await prisma.referralCommission.groupBy({
    by: ["referrerId", "currency"],
    where: { status: "pending", availableAt: { lte: now } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const rows = grouped.filter((g) => (g._sum.amount ?? 0) > 0);
  if (rows.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.referrerId) } },
    select: { id: true, name: true, email: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  const out: DueRow[] = [];
  for (const g of rows) {
    const u = byId.get(g.referrerId);
    if (!u) continue;
    const amount = g._sum.amount ?? 0;
    out.push({
      referrerId: g.referrerId,
      name: u.name,
      email: u.email,
      currency: g.currency,
      amount,
      commissionCount: g._count._all,
      meetsMinimum: amount >= minPayoutFor(g.currency),
      profile: await getPayoutProfile(g.referrerId),
    });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

/** Rows that can actually be paid now: over the minimum and with payout details. */
export function payableRows(rows: DueRow[]): DueRow[] {
  return rows.filter((r) => r.meetsMinimum && r.profile);
}

/**
 * Record that the referrer was paid their whole available balance in `currency`. Marks
 * exactly the commissions that made up that balance, in one transaction, so a commission
 * can never be paid twice. Returns null when nothing was due.
 */
export async function recordPayout(p: {
  referrerId: string;
  currency: string;
  reference: string;
  now?: Date;
}): Promise<{ payoutId: string; amount: number } | null> {
  const now = p.now ?? new Date();
  const profile = await prisma.payoutProfile.findUnique({ where: { userId: p.referrerId }, select: { method: true } });
  return prisma.$transaction(async (tx) => {
    const due = await tx.referralCommission.findMany({
      where: { referrerId: p.referrerId, currency: p.currency, status: "pending", availableAt: { lte: now } },
      select: { id: true, amount: true },
    });
    const amount = due.reduce((s, c) => s + c.amount, 0);
    if (due.length === 0 || amount <= 0) return null;
    const payout = await tx.referralPayout.create({
      data: {
        referrerId: p.referrerId,
        amount,
        currency: p.currency,
        method: profile?.method ?? "manual",
        reference: p.reference.trim().slice(0, 200),
        paidAt: now,
      },
    });
    const res = await tx.referralCommission.updateMany({
      where: { id: { in: due.map((c) => c.id) }, status: "pending" },
      data: { status: "paid", payoutId: payout.id },
    });
    if (res.count !== due.length) throw new Error("Commissions changed while recording the payout; retry.");
    return { payoutId: payout.id, amount };
  });
}

/** Admin: void a commission (e.g. a Stripe refund, which isn't mapped automatically yet). */
export async function reverseCommission(commissionId: string): Promise<boolean> {
  const res = await prisma.referralCommission.updateMany({
    where: { id: commissionId, status: "pending" },
    data: { status: "reversed", reversedAt: new Date() },
  });
  return res.count === 1;
}
