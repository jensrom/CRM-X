/**
 * Resend-sender — system-mails (invites, kvitteringer, notifikationer).
 *
 * Vi kalder Resends REST-API direkte via fetch — ingen ny dependency.
 * https://resend.com/docs/api-reference/emails/send-email
 *
 * Tenant-isoleret: hver tenant kan have sin egen Resend-key og sit eget
 * verificerede domæne. Hvis tenanten ikke har sat det op, falder vi tilbage
 * til en global RESEND_API_KEY + RESEND_FROM_ADDRESS env (til opstart).
 */

import { db } from "@/lib/db";
import { decrypt } from "./crypto";
import type { SendMailOpts, SendMailResult } from "./types";

interface ResendConfig {
  apiKey: string;
  fromAddress: string;
  fromName?: string;
  replyTo?: string;
}

async function getResendConfig(tenantId: string): Promise<ResendConfig | null> {
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: {
      resendApiKey: true, systemEmailFromAddress: true,
      systemEmailFromName: true, systemEmailReplyTo: true,
      systemEmailVerified: true,
    },
  });

  if (tenant?.resendApiKey && tenant.systemEmailFromAddress) {
    return {
      apiKey: decrypt(tenant.resendApiKey),
      fromAddress: tenant.systemEmailFromAddress,
      fromName: tenant.systemEmailFromName ?? undefined,
      replyTo: tenant.systemEmailReplyTo ?? undefined,
    };
  }

  // Fallback til env (typisk dev/onboarding)
  const envKey = process.env.RESEND_API_KEY;
  const envFrom = process.env.RESEND_FROM_ADDRESS;
  if (envKey && envFrom) {
    return { apiKey: envKey, fromAddress: envFrom };
  }
  return null;
}

export async function sendMailViaResend(
  tenantId: string,
  opts: SendMailOpts,
): Promise<SendMailResult> {
  const cfg = await getResendConfig(tenantId);
  if (!cfg) {
    return {
      success: false,
      provider: "resend",
      fromAddress: "",
      error: "Resend ikke konfigureret. Saet RESEND_API_KEY + RESEND_FROM_ADDRESS eller tenant.resendApiKey.",
    };
  }

  const from = cfg.fromName ? `${cfg.fromName} <${cfg.fromAddress}>` : cfg.fromAddress;
  const to  = Array.isArray(opts.to)  ? opts.to  : [opts.to];
  const cc  = opts.cc  ? (Array.isArray(opts.cc)  ? opts.cc  : [opts.cc])  : undefined;
  const bcc = opts.bcc ? (Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc]) : undefined;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to, cc, bcc,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        reply_to: opts.replyTo ?? cfg.replyTo,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      return {
        success: false,
        provider: "resend",
        fromAddress: cfg.fromAddress,
        error: `Resend ${res.status}: ${errText}`,
      };
    }

    const data = await res.json() as { id?: string };
    return {
      success: true,
      provider: "resend",
      fromAddress: cfg.fromAddress,
      messageId: data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      provider: "resend",
      fromAddress: cfg.fromAddress,
      error: err?.message ?? "Ukendt Resend-fejl",
    };
  }
}
