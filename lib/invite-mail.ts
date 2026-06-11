/**
 * CRM-X — Invite-mail templates
 *
 * To toner:
 *   - "warm" (Small/Medium) — hjertelig, varm, glad
 *   - "professional" (Large/Enterprise) — voksen, rolig, selvtillid
 *
 * Plain text + HTML version af hver mail.
 * Bruger Resend via lib/email.ts (skal eksistere — fallback til console.log).
 */

import { PLANS, type PlanSlug } from "./plans";

export interface InviteMailContext {
  recipientName: string;
  recipientFirstName: string;
  recipientTitle?: string | null;
  tenantName: string;
  tenantSlug: string;
  inviteUrl: string;
  expiresInDays: number;
  plan: PlanSlug;
  fromName?: string;
  fromEmail?: string;
}

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

const PRIMARY = "#2563EB";

function getTone(plan: PlanSlug): "warm" | "professional" {
  return PLANS[plan].inviteTone;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildWarmMail(ctx: InviteMailContext): RenderedMail {
  const greeting = ctx.recipientTitle
    ? `Hej ${escape(ctx.recipientFirstName)}, ${escape(ctx.recipientTitle.toLowerCase())}!`
    : `Hej ${escape(ctx.recipientFirstName)}!`;

  const subject = `Velkommen til CRM-X, ${ctx.recipientFirstName}! 🌱`;

  const text = `${greeting}

Vi er kæmpestolte over at have ${ctx.tenantName} ombord. CRM-X er bygget af konsulenter til konsulenter — og I er nu en del af rejsen.

Klik her for at sætte din adgangskode og kaste dig ud i det:
${ctx.inviteUrl}

Linket virker i ${ctx.expiresInDays} dage.

Hvis du har spørgsmål, så svar bare på denne mail — vi læser hver eneste.

Vi glæder os til at følge jer.

Hilsen
Plesner Tech
https://plesnertech.dk`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.06);">

<tr><td style="padding:32px 32px 16px 32px;">
<div style="display:inline-block;background:${PRIMARY};color:#FFFFFF;font-weight:700;font-size:13px;padding:8px 12px;border-radius:8px;letter-spacing:0.5px;">CRM-X</div>
</td></tr>

<tr><td style="padding:0 32px 8px 32px;">
<h1 style="margin:16px 0 8px 0;color:#0F172A;font-size:24px;font-weight:700;line-height:1.3;">Velkommen til CRM-X 🌱</h1>
<p style="margin:0;color:#475569;font-size:15px;line-height:1.5;">${greeting}</p>
</td></tr>

<tr><td style="padding:24px 32px 16px 32px;">
<p style="margin:0 0 16px 0;color:#1E293B;font-size:15px;line-height:1.65;">Vi er kæmpestolte over at have <strong>${escape(ctx.tenantName)}</strong> ombord. CRM-X er bygget af konsulenter til konsulenter — og I er nu en del af rejsen.</p>
<p style="margin:0;color:#1E293B;font-size:15px;line-height:1.65;">Klik på knappen herunder for at sætte din adgangskode og logge ind for første gang:</p>
</td></tr>

<tr><td align="center" style="padding:16px 32px 24px 32px;">
<a href="${ctx.inviteUrl}" style="display:inline-block;background:${PRIMARY};color:#FFFFFF;font-weight:600;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:10px;">Kom i gang →</a>
<p style="margin:12px 0 0 0;color:#94A3B8;font-size:12px;">Linket virker i ${ctx.expiresInDays} dage</p>
</td></tr>

<tr><td style="padding:0 32px 24px 32px;">
<div style="border-top:1px solid #E2E8F0;padding-top:20px;">
<p style="margin:0 0 8px 0;color:#475569;font-size:14px;line-height:1.6;">Spørgsmål? Svar bare på denne mail — vi læser hver eneste.</p>
<p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Vi glæder os til at følge jer.</p>
</div>
</td></tr>

<tr><td style="padding:24px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
<p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.5;">Sendt af Plesner Tech · <a href="https://plesnertech.dk" style="color:#94A3B8;">plesnertech.dk</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  return { subject, text, html };
}

function buildProfessionalMail(ctx: InviteMailContext): RenderedMail {
  const subject = `Din CRM-X-konto er klar — aktivér nu`;

  const text = `Kære ${escape(ctx.recipientName)},

CRM-X er klargjort til ${ctx.tenantName}.

Klik nedenfor for at sætte din adgangskode og aktivere kontoen. Du er live på under to minutter:

${ctx.inviteUrl}

Linket er gyldigt i ${ctx.expiresInDays} dage.

Hvis du har spørgsmål undervejs, svarer ${ctx.fromName ?? "Jens Plesner"} på ${ctx.fromEmail ?? "jens@plesnertech.dk"} med kort varsel.

Med venlig hilsen
Plesner Tech`;

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F8FAFC;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

<tr><td style="padding:32px 32px 16px 32px;">
<div style="color:${PRIMARY};font-weight:700;font-size:14px;letter-spacing:1.5px;">CRM-X</div>
</td></tr>

<tr><td style="padding:0 32px 8px 32px;">
<h1 style="margin:8px 0 16px 0;color:#0F172A;font-size:22px;font-weight:700;line-height:1.3;">Din CRM-X-konto er klar</h1>
<p style="margin:0;color:#475569;font-size:15px;line-height:1.6;">Kære ${escape(ctx.recipientName)},</p>
</td></tr>

<tr><td style="padding:16px 32px 8px 32px;">
<p style="margin:0 0 16px 0;color:#1E293B;font-size:15px;line-height:1.65;">CRM-X er klargjort til <strong>${escape(ctx.tenantName)}</strong>. Klik nedenfor for at sætte din adgangskode og aktivere kontoen.</p>
</td></tr>

<tr><td align="center" style="padding:16px 32px 24px 32px;">
<a href="${ctx.inviteUrl}" style="display:inline-block;background:${PRIMARY};color:#FFFFFF;font-weight:600;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:8px;">Aktivér min konto</a>
<p style="margin:12px 0 0 0;color:#94A3B8;font-size:12px;">Gyldig i ${ctx.expiresInDays} dage</p>
</td></tr>

<tr><td style="padding:0 32px 24px 32px;">
<div style="border-top:1px solid #E2E8F0;padding-top:20px;">
<p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">Spørgsmål? Skriv til <a href="mailto:${ctx.fromEmail ?? "jens@plesnertech.dk"}" style="color:${PRIMARY};">${ctx.fromEmail ?? "jens@plesnertech.dk"}</a>.</p>
</div>
</td></tr>

<tr><td style="padding:24px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
<p style="margin:0;color:#94A3B8;font-size:12px;line-height:1.5;">Plesner Tech · <a href="https://plesnertech.dk" style="color:#94A3B8;">plesnertech.dk</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  return { subject, text, html };
}

export function renderInviteMail(ctx: InviteMailContext): RenderedMail {
  const tone = getTone(ctx.plan);
  return tone === "warm" ? buildWarmMail(ctx) : buildProfessionalMail(ctx);
}

/**
 * Send invite-mail via Resend hvis konfigureret, ellers console.log.
 * Returnerer true ved succes, false ved fejl (men kaster ikke).
 */
export async function sendInviteMail(
  to: string,
  ctx: InviteMailContext
): Promise<{ ok: boolean; error?: string }> {
  const mail = renderInviteMail(ctx);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@plesnertech.dk";

  if (!apiKey) {
    console.log("[invite-mail] RESEND_API_KEY not set — would have sent:");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${mail.subject}`);
    console.log(`  Invite URL: ${ctx.inviteUrl}`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Plesner Tech <${from}>`,
        to: [to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${err}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Unknown send error" };
  }
}
