"use server";

/**
 * Billing-actions — Stripe Checkout + Customer Portal
 *
 * Adgangskontrol: kun admin-roller maa lave begge.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getStripe, planToPriceId, addOnToPriceId } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAddOnAvailable, type AddOnSlug, type PlanSlug } from "@/lib/plans";
import { audit } from "@/lib/audit";

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
 * Add-ons (Forecast etc.) tilfoejes som separate line-items saa fakturaen
 * viser dem som distinkte poster.
 *
 * Redirect'er til Stripe's hosted side.
 */
export async function startCheckout(
  plan: "small" | "medium" | "large",
  addOns: readonly string[] = [],
) {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId!;
  const userEmail = (session.user as any).email as string | undefined;

  const stripe = getStripe();
  const priceId = planToPriceId(plan);
  if (!priceId) {
    throw new Error(`Pris-id ikke konfigureret for plan "${plan}". Sæt STRIPE_PRICE_${plan.toUpperCase()} i env.`);
  }

  // Byg line-items: plan + alle valgte tilgaengelige add-ons.
  // Small kan ikke have add-ons — addOnToPriceId returnerer null og line-item skippes.
  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: priceId, quantity: 1 },
  ];
  for (const addon of addOns) {
    const addOnPrice = addOnToPriceId(addon, plan);
    if (addOnPrice) {
      lineItems.push({ price: addOnPrice, quantity: 1 });
    }
  }

  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: { stripeCustomerId: true, name: true, maxUsers: true },
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
    line_items: lineItems,
    success_url: `${appUrl}/settings/billing?status=success`,
    cancel_url:  `${appUrl}/settings/billing?status=cancelled`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { tenantId, addOns: addOns.join(",") },
    },
    metadata: { tenantId, addOns: addOns.join(",") },
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

// ────────────────────────────────────────────────────────────
// SELF-SERVICE ADD-ONS — tilkoeb/fjern Forecast etc. fra UI
// ────────────────────────────────────────────────────────────
//
// Flow:
//   • Trial-tenants (ingen Stripe-subscription): opdater tenant.addOns
//     direkte i DB. Bliver opkraevet naar de evt skifter til paid plan.
//   • Stripe-betalende tenants: kald Stripe Subscription API for at
//     tilfoeje/fjerne line-item med pro-rata billing. Webhook synker
//     vores DB efter Stripe's bekraeftelse.
//
// Begge flows ender med redirect til /settings/billing?addOnStatus=...
// saa UI kan vise et success-banner.

async function loadTenantForAddOnAction(tenantId: string) {
  return db.tenant.findFirst({
    where: { id: tenantId },
    select: {
      id: true, name: true, plan: true,
      stripeCustomerId: true, stripeSubscriptionId: true,
      modules: true, addOns: true,
    } as any,
  }) as any;
}

export async function purchaseAddOn(addOnSlug: string) {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId!;
  const returnUrl = "/settings/billing";

  const tenant = await loadTenantForAddOnAction(tenantId);
  if (!tenant) redirect(`${returnUrl}?addOnError=${encodeURIComponent("Tenant ikke fundet")}`);

  const planSlug = (tenant.plan ?? "small") as PlanSlug;
  if (!isAddOnAvailable(addOnSlug as AddOnSlug, planSlug)) {
    redirect(`${returnUrl}?addOnError=${encodeURIComponent(
      "Dette tilkoeb kraever Medium- eller Large-pakken. Opgrader din plan foerst.",
    )}`);
  }

  const currentAddOns: string[] = tenant.addOns ?? [];
  if (currentAddOns.includes(addOnSlug)) {
    redirect(`${returnUrl}?addOnOk=${encodeURIComponent("Tilkøbet er allerede aktivt")}`);
  }

  const newAddOns = [...currentAddOns, addOnSlug];
  const mergedModules = Array.from(new Set([...(tenant.modules ?? []), addOnSlug]));

  // ── Stripe-betalende: opdater subscription med pro-rata ──
  if (tenant.stripeSubscriptionId) {
    const stripePriceId = addOnToPriceId(addOnSlug, planSlug);
    if (!stripePriceId) {
      redirect(`${returnUrl}?addOnError=${encodeURIComponent(
        "Stripe pris-id ikke konfigureret for dette tilkoeb — kontakt support",
      )}`);
    }

    try {
      const stripe = getStripe();
      await stripe.subscriptionItems.create({
        subscription: tenant.stripeSubscriptionId,
        price: stripePriceId!,
        proration_behavior: "create_prorations",
      });
      // Webhook (customer.subscription.updated) opdaterer DB. Vi sker IKKE
      // direkte her saa vi undgaar double-update race-conditions.
    } catch (e: any) {
      console.error("[billing.purchaseAddOn] Stripe-fejl:", e);
      redirect(`${returnUrl}?addOnError=${encodeURIComponent(
        "Kunne ikke tilfoeje tilkoeb hos Stripe — proev igen eller kontakt support",
      )}`);
    }
  } else {
    // ── Trial / manuel-fakturering: bare DB-opdatering ──
    await db.tenant.update({
      where: { id: tenantId },
      data: { addOns: newAddOns, modules: mergedModules } as any,
    });
  }

  await audit({
    action: "addon_purchased",
    resourceType: "tenant",
    resourceId: tenantId,
    tenantIdOverride: tenantId,
    after: { addOnSlug, billing: tenant.stripeSubscriptionId ? "stripe_pro_rata" : "trial_direct" },
    message: `Add-on "${addOnSlug}" tilkoebt`,
  });

  revalidatePath(returnUrl);
  redirect(`${returnUrl}?addOnOk=${encodeURIComponent(`${addOnSlug} er aktiveret`)}`);
}

export async function removeAddOn(addOnSlug: string) {
  const session = await requireAdmin();
  const tenantId = session.user.tenantId!;
  const returnUrl = "/settings/billing";

  const tenant = await loadTenantForAddOnAction(tenantId);
  if (!tenant) redirect(`${returnUrl}?addOnError=${encodeURIComponent("Tenant ikke fundet")}`);

  const currentAddOns: string[] = tenant.addOns ?? [];
  if (!currentAddOns.includes(addOnSlug)) {
    redirect(`${returnUrl}?addOnOk=${encodeURIComponent("Tilkøbet er allerede inaktivt")}`);
  }

  const newAddOns = currentAddOns.filter((a) => a !== addOnSlug);
  const newModules = (tenant.modules ?? []).filter((m: string) => m !== addOnSlug);

  if (tenant.stripeSubscriptionId) {
    // Find subscription-item-id for dette add-on og slet det
    try {
      const stripe = getStripe();
      const sub = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
      const planSlug = (tenant.plan ?? "small") as PlanSlug;
      const addOnPriceId = addOnToPriceId(addOnSlug, planSlug);
      const item = sub.items.data.find((it: any) => it.price.id === addOnPriceId);
      if (item) {
        await stripe.subscriptionItems.del(item.id, {
          proration_behavior: "create_prorations",
        });
      }
      // Webhook opdaterer DB
    } catch (e: any) {
      console.error("[billing.removeAddOn] Stripe-fejl:", e);
      redirect(`${returnUrl}?addOnError=${encodeURIComponent(
        "Kunne ikke fjerne tilkoeb hos Stripe — proev igen eller kontakt support",
      )}`);
    }
  } else {
    await db.tenant.update({
      where: { id: tenantId },
      data: { addOns: newAddOns, modules: newModules } as any,
    });
  }

  await audit({
    action: "addon_removed",
    resourceType: "tenant",
    resourceId: tenantId,
    tenantIdOverride: tenantId,
    after: { addOnSlug },
    message: `Add-on "${addOnSlug}" fjernet`,
  });

  revalidatePath(returnUrl);
  redirect(`${returnUrl}?addOnOk=${encodeURIComponent(`${addOnSlug} er fjernet`)}`);
}
