/**
 * Stripe-client + helpers
 * ────────────────────────
 * Strategi:
 *   • Vi bruger Stripe Checkout (hosted) og Customer Portal (hosted) saa vi
 *     ikke selv skal bygge betalings-UI. Det reducerer scope dramatisk og
 *     overholder PCI-DSS uden ekstra arbejde.
 *   • Vores rolle: starte Checkout/Portal, lytte til webhooks, opdatere Tenant.
 *
 * Setup paa Vercel:
 *   STRIPE_SECRET_KEY        = sk_live_...        (eller sk_test_... i dev)
 *   STRIPE_WEBHOOK_SECRET    = whsec_...          (fra Stripe dashboard)
 *   STRIPE_PRICE_SMALL       = price_xxx          (din price-id for small-pakke)
 *   STRIPE_PRICE_MEDIUM      = price_xxx
 *   STRIPE_PRICE_LARGE       = price_xxx
 *   NEXT_PUBLIC_APP_URL      = https://crm-x-eight.vercel.app
 */

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY ikke sat — Stripe-integration kraever env-vars");
  }
  _stripe = new Stripe(key, {
    apiVersion: "2025-09-30.clover" as any, // Brug nyeste stabile API
    typescript: true,
  });
  return _stripe;
}

/**
 * Mapper plan-slug til Stripe price-id fra env.
 * Falder tilbage til small hvis ukendt.
 */
export function planToPriceId(plan: string): string {
  switch (plan) {
    case "medium":   return process.env.STRIPE_PRICE_MEDIUM ?? "";
    case "large":    return process.env.STRIPE_PRICE_LARGE  ?? "";
    case "small":
    default:         return process.env.STRIPE_PRICE_SMALL  ?? "";
  }
}

/**
 * Mapper price-id tilbage til plan-slug + maxUsers.
 * Bruges af webhook til at opdatere tenant.plan + maxUsers.
 */
export function priceIdToPlan(priceId: string): { plan: string; maxUsers: number } {
  if (priceId === process.env.STRIPE_PRICE_MEDIUM) return { plan: "medium", maxUsers: 25 };
  if (priceId === process.env.STRIPE_PRICE_LARGE)  return { plan: "large",  maxUsers: 100 };
  return { plan: "small", maxUsers: 5 };
}

/**
 * Mapper Stripe subscription status til vores billingStatus.
 */
export function stripeStatusToBilling(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":          return "paid";
    case "past_due":
    case "unpaid":            return "overdue";
    case "canceled":          return "cancelled";
    case "incomplete":
    case "incomplete_expired":return "trial";
    default:                  return "trial";
  }
}
