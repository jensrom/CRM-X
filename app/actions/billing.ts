"use server";

/**
 * Billing-actions — Stripe Checkout + Customer Portal
 *
 * Adgangskontrol: kun admin-roller maa lave begge.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getStripe, planToPriceId } from "@/lib/stripe";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const role = (session.user.role ?? "").toLowerCase();
  if (!["admin", "administrator", "super_admin"].includes(role)) {
    throw new Error("Kun administrator kan ændre billing");
  }
  return session;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "https://crm-x-eight.vercel.app";
}

/**
 * Starter en Stripe Checkout Session for opgradering / nyt abonnement.
 * Redirect'er til Stripe's hosted side.
 */
export async function startCheckout(plan: "small" | "medium" | "large") {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId!;
  const userEmail = (session.user as any).email as string | undefined;

  const stripe = getStripe();
  const priceId = planToPriceId(plan);
  if (!priceId) {
    throw new Error(`Pris-id ikke konfigureret for plan "${plan}". Sæt STRIPE_PRICE_${plan.toUpperCase()} i env.`);
  }

  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { stripeCustomerId: true, name: true },
  });

  // Opret Stripe customer hvis ikke eksisterer
  let customerId = tenant?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userEmail,
      name:  tenant?.name,
      metadata: { tenantId },
    });
    customerId = customer.id;
    await db.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = getAppUrl();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings/billing?status=success`,
    cancel_url:  `${appUrl}/settings/billing?status=cancelled`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { tenantId },
    },
    metadata: { tenantId },
  });

  if (!checkoutSession.url) {
    throw new Error("Kunne ikke oprette checkout-session");
  }
  redirect(checkoutSession.url);
}

/**
 * Aabner Stripe Customer Portal hvor tenanten kan:
 *   • Skifte plan
 *   • Opdatere kreditkort
 *   • Annullere
 *   • Downloade kvitteringer
 */
export async function openCustomerPortal() {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId!;

  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { stripeCustomerId: true },
  });
  if (!tenant?.stripeCustomerId) {
    throw new Error("Ingen Stripe-customer endnu — opret et abonnement først");
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   tenant.stripeCustomerId,
    return_url: `${appUrl}/settings/billing`,
  });
  redirect(portalSession.url);
}
