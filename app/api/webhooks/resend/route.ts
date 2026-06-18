/**
 * POST /api/webhooks/resend
 * Modtager event-callbacks fra Resend og opdaterer matching EmailLog-rækker.
 *
 * Events vi reagerer paa:
 *   • email.delivered     → status="delivered", deliveredAt
 *   • email.bounced       → status="bounced", failedAt + errorMessage
 *   • email.complained    → status="bounced" + errorMessage (spam-klage)
 *   • email.delivery_delayed → ignoreres (kun status-info, fanges senere)
 *   • email.opened        → ignoreres (tracker vi ikke pt — privacy-bevidst)
 *   • email.clicked       → ignoreres
 *
 * Sikkerhed:
 *   • Vi verificerer Resend's signaturheader (svix-id, svix-timestamp, svix-signature)
 *     hvis env RESEND_WEBHOOK_SECRET er sat — ellers logger vi advarsel
 *
 * Setup:
 *   • Resend Dashboard → Webhooks → Add Endpoint
 *   • URL: https://<din-app>/api/webhooks/resend
 *   • Vælg: email.delivered, email.bounced, email.complained
 *   • Kopiér secret til Vercel env: RESEND_WEBHOOK_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "node:crypto";

export const runtime  = "nodejs";
export const dynamic  = "force-dynamic";

interface ResendEvent {
  type:       string;
  created_at: string;
  data: {
    email_id?:   string;
    to?:         string[];
    from?:       string;
    subject?:    string;
    bounce?:     { type?: string; subType?: string; message?: string };
    [k: string]: any;
  };
}

/**
 * Resend bruger Svix til at signere webhooks.
 * https://docs.svix.com/receiving/verifying-payloads/how
 */
function verifySvixSignature(
  rawBody: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): boolean {
  try {
    // Resend's secret format: "whsec_<base64>"
    const secretBytes = secret.startsWith("whsec_")
      ? Buffer.from(secret.slice(6), "base64")
      : Buffer.from(secret, "utf8");

    const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expectedSig = crypto
      .createHmac("sha256", secretBytes)
      .update(signedPayload)
      .digest("base64");

    // Svix-signature header indeholder potentielt flere underskrifter "v1,sig1 v1,sig2"
    return svixSignature
      .split(" ")
      .map((p) => p.split(",")[1])
      .filter(Boolean)
      .some((sig) => crypto.timingSafeEqual(
        Buffer.from(sig, "utf8"),
        Buffer.from(expectedSig, "utf8"),
      ));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verificer signatur hvis secret er sat
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const svixId        = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Manglende signatur-headers" }, { status: 401 });
    }
    if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, secret)) {
      return NextResponse.json({ error: "Ugyldig signatur" }, { status: 401 });
    }
  } else {
    console.warn("[resend-webhook] RESEND_WEBHOOK_SECRET ikke sat — webhook accepteres uden signatur-tjek");
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const emailId = event.data.email_id;
  if (!emailId) {
    return NextResponse.json({ received: true, note: "Ingen email_id" });
  }

  // Find EmailLog via providerMessageId
  const log = await db.emailLog.findFirst({
    where: { providerMessageId: emailId },
  });
  if (!log) {
    // Kunne ikke matche — accepter alligevel saa Resend ikke retry'er evigt
    return NextResponse.json({ received: true, note: "Ingen matching log" });
  }

  // Map event til status
  switch (event.type) {
    case "email.delivered":
      await db.emailLog.update({
        where: { id: log.id },
        data: { status: "delivered", deliveredAt: new Date() },
      });
      break;

    case "email.bounced":
      await db.emailLog.update({
        where: { id: log.id },
        data: {
          status:       "bounced",
          failedAt:     new Date(),
          errorMessage: event.data.bounce?.message ?? `Bounced: ${event.data.bounce?.type ?? "ukendt"}`,
        },
      });
      break;

    case "email.complained":
      await db.emailLog.update({
        where: { id: log.id },
        data: {
          status:       "bounced",
          failedAt:     new Date(),
          errorMessage: "Modtager markerede som spam",
        },
      });
      break;

    default:
      // Ignorer øvrige (opened, clicked, delivery_delayed)
      break;
  }

  return NextResponse.json({ received: true });
}
