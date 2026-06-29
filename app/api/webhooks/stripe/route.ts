/**
 * POST /api/webhooks/stripe
 * Modtager events fra Stripe og holder tenant.billingStatus synkroniseret.
 *
 * Events vi reagerer paa:
 *   • customer.subscription.created    → ny subscription oprettet (efter checkout)
 *   • customer.subscription.updated    → plan-skifte, status-aendring
 *   • customer.subscription.deleted    → annulleret
 *   • invoice.payment_succeeded        → betaling ok (kunne logge til EmailLog)
 *   • invoice.payment_failed           → betaling fejlede (sender notifikation)
 *
 * Setup:
 *   • Stripe Dashboard → Developers → Webhooks → Add endpoint
 *   • URL: https://<din-app>/api/webhooks/stripe
 *   • Vaelg "Select events" → de 5 ovenfor
 *   • Kopiér Signing secret til Vercel env: STRIPE_WEBHOOK_SECRET
 *
 * Sikkerhed:
 *   • stripe.webhooks.constructEvent verificerer signaturen — kraeves
 *   • Hvis STRIPE_WEBHOOK_SECRET ikke er sat, afviser vi alle webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe, priceIdToPlan, stripeStatusToBilling } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET ikke sat" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Manglende stripe-signature header" }, { status: 401 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    console.error("[stripe-webhook] signatur-verifikation fejlede:", err.message);
    return NextResponse.json({ error: "Ugyldig signatur" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":  {
        const sub = event.data.object as Stripe.Subscription;
        await syncSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        // Ignorer events vi ikke reagerer paa
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook] processing-fejl:", err);
    // Returner 200 alligevel saa Stripe ikke retry'er evigt — vi har logget
    return NextResponse.json({ received: true, warning: err?.message ?? "unknown" });
  }
}

// ─── Event-handlers ──────────────────────────────────────────

async function syncSubscription(sub: Stripe.Subscription) {
  const tenantId = sub.metadata?.tenantId;
  if (!tenantId) {
    console.warn("[stripe-webhook] subscription mangler tenantId i metadata", sub.id);
    return;
  }

  // Identificer plan-line-item (foerste der matcher en plan-price-id).
  // Add-on items (Forecast etc.) findes i de oevrige items.
  const planPriceIds = new Set(
    [process.env.STRIPE_PRICE_SMALL, process.env.STRIPE_PRICE_MEDIUM, process.env.STRIPE_PRICE_LARGE].filter(Boolean) as string[],
  );
  const planItem = sub.items.data.find((it) => planPriceIds.has(it.price.id));
  const priceId = planItem?.price.id ?? sub.items.data[0]?.price.id ?? null;
  const { plan, maxUsers } = priceId ? priceIdToPlan(priceId) : { plan: "small", maxUsers: 5 };

  // Saml add-on slugs ud fra de oevrige price-ids
  const addOnSlugs: string[] = [];
  for (const it of sub.items.data) {
    const pid = it.price.id;
    if (pid === process.env.STRIPE_PRICE_FORECAST_MEDIUM || pid === process.env.STRIPE_PRICE_FORECAST_LARGE) {
      addOnSlugs.push("forecast");
    }
  }

  const billingStatus = stripeStatusToBilling(sub.status);

  // Stripe API har current_period_end paa subscription
  const periodEnd = (sub as any).current_period_end
    ? new Date((sub as any).current_period_end * 1000)
    : null;

  // Hold modules synkront med addOns (auto-merge for sidebar-gating)
  const existing = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { modules: true } as any,
  });
  const baseModules = ((existing as any)?.modules ?? []).filter((m: string) => m !== "forecast");
  const mergedModules = Array.from(new Set([...baseModules, ...addOnSlugs]));

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      stripeSubscriptionId: sub.id,
      stripePriceId:        priceId,
      currentPeriodEnd:     periodEnd,
      billingStatus,
      plan,
      maxUsers,
      addOns: addOnSlugs,
      modules: mergedModules,
      // Hvis kunden var paa trial, marker tenant som aktiv nu
      status: sub.status === "active" || sub.status === "trialing" ? "active" : undefined,
    } as any,
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const tenantId = sub.metadata?.tenantId;
  if (!tenantId) return;

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      billingStatus:        "cancelled",
      stripeSubscriptionId: null,
      stripePriceId:        null,
      // Behold currentPeriodEnd — kunden har adgang indtil periode-slut
    },
  });
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Find tenant via customer-id
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const tenant = await db.tenant.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      billingStatus: "paid",
      // Forny nextInvoiceDue baseret paa subscription
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const tenant = await db.tenant.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!tenant) return;

  await db.tenant.update({
    where: { id: tenant.id },
    data: { billingStatus: "overdue" },
  });

  // Send notifikation til admin-brugere
  try {
    const admins = await db.user.findMany({
      where: { tenantId: tenant.id, isActive: true, role: { name: { in: ["admin", "super_admin"] } } },
      select: { id: true },
    });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          tenantId: tenant.id,
          userId:   admin.id,
          type:     "payment_failed",
          title:    "Betaling fejlede",
          message:  "Din seneste faktura blev ikke betalt. Opdater dit kort i Indstillinger → Billing.",
          linkUrl:  "/settings/billing",
        },
      });
    }
  } catch {}
}
