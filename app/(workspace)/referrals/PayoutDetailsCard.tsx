"use client";

import { useState } from "react";
import { PayoutMark } from "@/app/components/PayoutLogos";
import { COUNTRIES, countryName, flagEmoji } from "@/lib/countries";

export type PayoutProfile = {
  method: "paypal" | "wise" | "bank";
  destination: string;
  legalName: string;
  country: string;
  taxId: string | null;
  updatedAt: string;
};

type Method = PayoutProfile["method"];
type Bank = { accountHolder: string; accountNumber: string; bankName: string; swift: string; routing: string };

const METHODS: Array<{ id: Method; name: string; blurb: string; speed: string }> = [
  { id: "paypal", name: "PayPal", blurb: "Sent to your PayPal email", speed: "Usually same day" },
  { id: "wise", name: "Wise", blurb: "Lands in your local currency", speed: "Usually 1–2 days" },
  { id: "bank", name: "Bank transfer", blurb: "SWIFT / IBAN to any bank", speed: "2–5 business days" },
];

const EMPTY_BANK: Bank = { accountHolder: "", accountNumber: "", bankName: "", swift: "", routing: "" };

const inputCls =
  "mt-1.5 w-full h-11 px-3.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground/70 text-sm focus:outline-none focus:border-foreground/40 focus:ring-4 focus:ring-ring/10 transition";
const labelCls = "text-[13px] font-medium text-foreground";
const hintCls = "mt-1 text-xs text-muted-foreground";

function parseBank(destination: string): Bank {
  try {
    const b = JSON.parse(destination) as Partial<Bank>;
    return { ...EMPTY_BANK, ...b, routing: b.routing ?? "" };
  } catch {
    return EMPTY_BANK;
  }
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}${"•".repeat(Math.max(3, Math.min(6, local.length - 2)))}@${domain}`;
}

function summaryLine(p: PayoutProfile) {
  if (p.method !== "bank") return maskEmail(p.destination);
  const b = parseBank(p.destination);
  return `${b.bankName || "Bank"} •••• ${b.accountNumber.slice(-4)}`;
}

/** Tax-ID hint that names the identifier creators in that country actually have. */
function taxHint(country: string) {
  const byCountry: Record<string, string> = {
    IN: "Your PAN, e.g. ABCDE1234F",
    US: "Leave blank unless asked — we'll request a W-9/W-8 form if required",
    GB: "Your UTR or VAT number, if you have one",
    AU: "Your ABN or TFN, if you have one",
    CA: "Your SIN or Business Number, if required",
  };
  return byCountry[country] ?? "VAT, TIN or equivalent, if your country requires one";
}

export function PayoutDetailsCard({
  profile,
  hasEarnings,
  minPayoutLabel,
  onSaved,
}: {
  profile: PayoutProfile | null;
  hasEarnings: boolean;
  minPayoutLabel: string;
  onSaved: (p: PayoutProfile) => void;
}) {
  const [editing, setEditing] = useState(!profile);
  const [method, setMethod] = useState<Method>(profile?.method ?? "paypal");
  const [email, setEmail] = useState(profile && profile.method !== "bank" ? profile.destination : "");
  const [bank, setBank] = useState<Bank>(profile?.method === "bank" ? parseBank(profile.destination) : EMPTY_BANK);
  const [legalName, setLegalName] = useState(profile?.legalName ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [taxId, setTaxId] = useState(profile?.taxId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const setB = (k: keyof Bank) => (e: React.ChangeEvent<HTMLInputElement>) => setBank((b) => ({ ...b, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/referrals/payout-profile", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, destination: email, bank, legalName, country, taxId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save your payout details.");
      onSaved(body.payoutProfile);
      setEditing(false);
      setJustSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your payout details.");
    } finally {
      setSaving(false);
    }
  };

  const active = METHODS.find((m) => m.id === method)!;

  return (
    <section className="bg-background border-border overflow-hidden rounded-2xl border">
      <div className="flex items-start justify-between gap-4 p-6 pb-0">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Payout method</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paid monthly once your balance passes {minPayoutLabel}. You can change this any time.
          </p>
        </div>
      </div>

      {hasEarnings && !profile && (
        <div className="mx-6 mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <span aria-hidden>●</span> You have earnings waiting. Add a payout method so we can send them.
        </div>
      )}

      {/* Saved state */}
      {profile && !editing && (
        <div className="p-6">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/30 p-4">
            <PayoutMark method={profile.method} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {METHODS.find((m) => m.id === profile.method)?.name}
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Active
                </span>
              </p>
              <p className="mt-0.5 truncate font-mono text-[13px] text-muted-foreground">{summaryLine(profile)}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {profile.legalName} · {flagEmoji(profile.country)} {countryName(profile.country)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setJustSaved(false);
              }}
              className="h-9 shrink-0 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Change
            </button>
          </div>
          {justSaved && (
            <p className="mt-3 text-sm text-green-700 dark:text-green-400" role="status">
              Saved. Future payouts will go here.
            </p>
          )}
        </div>
      )}

      {/* Edit state */}
      {editing && (
        <form onSubmit={save} className="p-6">
          <div role="radiogroup" aria-label="Payout method" className="grid gap-2.5 sm:grid-cols-3">
            {METHODS.map((m) => {
              const on = m.id === method;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMethod(m.id)}
                  className={`relative flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all sm:flex-col sm:items-start sm:gap-3 sm:p-4 ${
                    on
                      ? "border-foreground bg-background shadow-[0_0_0_1px_var(--foreground)]"
                      : "border-border bg-muted/20 hover:border-foreground/30 hover:bg-background"
                  }`}
                >
                  <PayoutMark method={m.id} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{m.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{m.blurb}</span>
                    <span className="mt-1 block text-[11px] font-medium text-muted-foreground/80">{m.speed}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`absolute right-3.5 top-3.5 flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                      on ? "border-foreground bg-foreground text-background" : "border-border bg-background"
                    }`}
                  >
                    {on && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 space-y-5">
            {method !== "bank" ? (
              <label className="block">
                <span className={labelCls}>{active.name} account email</span>
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls}
                />
                <p className={hintCls}>
                  {method === "paypal"
                    ? "The email you log in to PayPal with. It must be able to receive payments."
                    : "The email on your Wise account. Wise converts the payout into your local currency."}
                </p>
              </label>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className={labelCls}>Account holder name</span>
                  <input required value={bank.accountHolder} onChange={setB("accountHolder")} autoComplete="name" className={inputCls} />
                  <p className={hintCls}>Exactly as it appears on your bank account.</p>
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelCls}>Account number or IBAN</span>
                  <input
                    required
                    value={bank.accountNumber}
                    onChange={setB("accountNumber")}
                    placeholder="e.g. GB33 BUKB 2020 1555 5555 55"
                    spellCheck={false}
                    className={`${inputCls} font-mono tracking-wide placeholder:font-sans placeholder:tracking-normal`}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Bank name</span>
                  <input required value={bank.bankName} onChange={setB("bankName")} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>SWIFT / BIC</span>
                  <input
                    required
                    value={bank.swift}
                    onChange={setB("swift")}
                    placeholder="8 or 11 characters"
                    maxLength={11}
                    spellCheck={false}
                    className={`${inputCls} font-mono uppercase tracking-wide placeholder:normal-case placeholder:font-sans placeholder:tracking-normal`}
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelCls}>
                    Routing / sort code / IFSC <span className="font-normal text-muted-foreground">(if your country uses one)</span>
                  </span>
                  <input value={bank.routing} onChange={setB("routing")} spellCheck={false} className={`${inputCls} font-mono tracking-wide`} />
                </label>
              </div>
            )}

            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Payee details</h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>Full legal name</span>
                  <input required value={legalName} onChange={(e) => setLegalName(e.target.value)} autoComplete="name" className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Country of residence</span>
                  <select required value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className={labelCls}>
                    Tax ID <span className="font-normal text-muted-foreground">(optional)</span>
                  </span>
                  <input value={taxId} onChange={(e) => setTaxId(e.target.value)} spellCheck={false} className={`${inputCls} font-mono tracking-wide`} />
                  <p className={hintCls}>{taxHint(country)}</p>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Encrypted at rest and only used to send your referral earnings. Kitevo never charges this account.
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-full bg-foreground px-7 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {saving ? "Saving…" : profile ? "Save changes" : method === "bank" ? "Add bank account" : `Connect ${active.name}`}
            </button>
            {profile && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                className="h-11 rounded-full px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
