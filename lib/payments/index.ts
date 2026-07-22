import type { PaymentProvider } from "./types";
import { stripeProvider } from "./stripe-provider";

/**
 * The active payment provider.
 *
 * Adding one (Dodo, Paddle, Lemon Squeezy) means writing a second file implementing
 * `PaymentProvider` and selecting it here, ideally from an env var so the switch is a
 * config change rather than a deploy of new logic:
 *
 *   const providers = { stripe: stripeProvider, dodo: dodoProvider };
 *   export const payments = providers[process.env.PAYMENT_PROVIDER ?? "stripe"];
 *
 * Left as a direct binding for now because there is exactly one implementation, and a
 * lookup with a single entry is indirection without benefit.
 *
 * Note the DB column is still `User.stripeCustomerId`. It holds whatever the active
 * provider calls a customer, so a rename is cosmetic and would cost a migration; worth
 * doing at the point a second provider actually ships.
 */
export const payments: PaymentProvider = stripeProvider;

export type {
  CheckoutSnapshot,
  CreateCheckoutParams,
  PaymentProvider,
  PaymentWebhookEvent,
  SubscriptionSnapshot,
  SubscriptionStatus,
} from "./types";
export { WebhookVerificationError } from "./types";
