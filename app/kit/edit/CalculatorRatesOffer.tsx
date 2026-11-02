"use client";

import { useSyncExternalStore } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/app/components/workspace/Button";
import { CALCULATOR_RATES_KEY, parseSavedRates, type SavedCalculatorRates } from "@/lib/creator-calculators";

const EVENT = "kitevo:calculator-rates";

/** The raw saved string as an external store (stable primitive snapshot; null on the server). */
const store = {
  subscribe(cb: () => void) {
    window.addEventListener("storage", cb);
    window.addEventListener(EVENT, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(EVENT, cb);
    };
  },
  get(): string | null {
    try {
      return localStorage.getItem(CALCULATOR_RATES_KEY);
    } catch {
      return null;
    }
  },
  clear() {
    try {
      localStorage.removeItem(CALCULATOR_RATES_KEY);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  },
};

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/**
 * "Use the rates from the calculator?" — shown in the Rates section when the creator came
 * from /tools/rate-calculator and their kit has no priced rates yet. Using or dismissing
 * clears the saved rates so it's offered once.
 */
export function CalculatorRatesOffer({ onUse }: { onUse: (items: SavedCalculatorRates["items"]) => void }) {
  const raw = useSyncExternalStore(store.subscribe, store.get, () => null);
  const saved = parseSavedRates(raw);
  if (!saved) return null;
  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary-soft p-4 text-primary-soft-foreground">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Calculator size={15} aria-hidden /> Use the rates from the calculator?
      </p>
      <p className="mt-1 text-xs leading-relaxed opacity-85">
        {saved.items.map((i) => `${i.label} ${usd(i.price)}`).join(" · ")}. You can edit them after.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            onUse(saved.items);
            store.clear();
          }}
        >
          Add these rates
        </Button>
        <Button size="sm" variant="ghost" onClick={() => store.clear()}>
          No thanks
        </Button>
      </div>
    </div>
  );
}
