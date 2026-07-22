import type { PaymentProvider } from "./types";
import { stripeProvider } from "./stripe-provider";
import { dodoProvider } from "./dodo-provider";

const PROVIDERS: Record<string, PaymentProvider> = {
  stripe: stripeProvider,
  dodo: dodoProvider,
};

/**
 * The active payment provider, chosen by `PAYMENT_PROVIDER` (default: stripe).
 *
 * Defaults to stripe rather than throwing on an unset value so local and preview builds
 * keep working without extra config. An *unrecognised* value does throw: silently falling
 * back to a different provider than intended would take real payments through the wrong
 * account.
 *
 * `config/subscriptions.ts` reads the same variable to pick between `STRIPE_PRICE_ID_*`
 * and `DODO_PRODUCT_ID_*`, so the ids always match the provider.
 *
 * The DB column is still `User.stripeCustomerId`. It holds whatever the active provider
 * calls a customer; renaming costs a migration and is worth doing only once one provider
 * is settled on.
 */
const configured = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();

if (configured && !PROVIDERS[configured]) {
  throw new Error(
    `Unknown PAYMENT_PROVIDER "${configured}". Expected one of: ${Object.keys(PROVIDERS).join(", ")}`
  );
}

export const payments: PaymentProvider = PROVIDERS[configured ?? "stripe"];

export type {
  CheckoutSnapshot,
  CreateCheckoutParams,
  PaymentProvider,
  PaymentWebhookEvent,
  SubscriptionSnapshot,
  SubscriptionStatus,
} from "./types";
export { WebhookVerificationError } from "./types";
