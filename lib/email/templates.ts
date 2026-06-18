/**
 * Email-templates
 * ───────────────
 * Branded HTML-templates til system-mails.
 *
 * Designaftaler:
 *   • Inline-styles (mail-klienter strippe ofte <style> blokke)
 *   • Width max 600px (standard for mail)
 *   • Brug tenant-accent-farve hvor det giver mening
 *   • Logo hvis sat, ellers tenant-navn som tekst
 *   • Footer med "afsendt af CRM-X" + CVR/kontakt
 *   • Plain text version genereres automatisk
 *
 * Templates:
 *   • genericBranded — wrapper med header, footer, content-slot
 *   • inviteTemplate — invitér ny bruger
 *   • notifyTemplate — generel notifikation til kunde
 */

interface BrandedOpts {
  tenantName:      string;
  logoUrl?:        string | null;
  accentColor?:    string | null;
  invoiceFooter?:  string | null;
  invoiceCvr?:     string | null;
  /** Subject vises ikke i body — bruges af caller */
  title:           string;
  /** Hoved-tekst (markdown-lignende: enkelt linjeskift = <br>, dobbelt = <p>) */
  message:         string;
  /** Valgfri CTA-knap */
  cta?: {
    label: string;
    href:  string;
  };
  /** Footer-tekst (overskriver default) */
  footerText?:    string;
}

const DEFAULT_ACCENT = "#2563EB";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphify(message: string): string {
  // Dobbelt linjeskift -> nyt <p>, enkelt -> <br>
  return message
    .split(/\n\n+/)
    .map((para) => `<p style="margin:0 0 16px 0;line-height:1.6;color:#1F2937;">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

/**
 * Generic branded HTML wrapper.
 * Bruges af alle system-mails for konsistent look.
 */
export function genericBranded(opts: BrandedOpts): { html: string; text: string } {
  const accent = opts.accentColor ?? DEFAULT_ACCENT;
  const safeAccent = /^#[0-9A-Fa-f]{6}$/.test(accent) ? accent : DEFAULT_ACCENT;

  const headerLogo = opts.logoUrl
    ? `<img src="${escapeHtml(opts.logoUrl)}" alt="${escapeHtml(opts.tenantName)}" style="max-height:40px;max-width:160px;object-fit:contain;" />`
    : `<span style="font-size:20px;font-weight:700;color:${safeAccent};">${escapeHtml(opts.tenantName)}</span>`;

  const ctaButton = opts.cta
    ? `
      <table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
        <tr>
          <td bgcolor="${safeAccent}" style="border-radius:6px;">
            <a href="${escapeHtml(opts.cta.href)}"
               style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:white;text-decoration:none;border-radius:6px;">
              ${escapeHtml(opts.cta.label)}
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  const footer = opts.footerText
    ? escapeHtml(opts.footerText)
    : `${escapeHtml(opts.tenantName)}${opts.invoiceCvr ? ` · CVR ${escapeHtml(opts.invoiceCvr)}` : ""}`;

  const html = `<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #E5E7EB;background-color:#FFFFFF;">
              ${headerLogo}
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">
                ${escapeHtml(opts.title)}
              </h1>
              ${paragraphify(opts.message)}
              ${ctaButton}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #E5E7EB;background-color:#F9FAFB;font-size:11px;color:#6B7280;text-align:center;line-height:1.5;">
              ${footer}
              <br/>
              <span style="color:#9CA3AF;">Sendt fra CRM-X</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Plain-text version (Apple Mail, ældre Outlook fallback)
  const text = [
    opts.title,
    "",
    opts.message,
    opts.cta ? `\n${opts.cta.label}: ${opts.cta.href}` : "",
    "",
    "—",
    opts.tenantName + (opts.invoiceCvr ? ` · CVR ${opts.invoiceCvr}` : ""),
    "Sendt fra CRM-X",
  ].filter(Boolean).join("\n");

  return { html, text };
}

/**
 * Henter tenant-branding-info til templates.
 * Cacher ikke — kaldes pr. mail saa accent-aendringer slaar igennem straks.
 */
export async function getBrandingForTenant(tenantId: string): Promise<{
  tenantName:     string;
  logoUrl:        string | null;
  accentColor:    string | null;
  invoiceCvr:     string | null;
  invoiceFooter:  string | null;
}> {
  const { db } = await import("@/lib/db");
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: {
      name: true, logoUrl: true, accentColor: true,
      invoiceCvr: true, invoiceFooter: true,
    },
  });
  return {
    tenantName:    tenant?.name           ?? "CRM-X",
    logoUrl:       tenant?.logoUrl        ?? null,
    accentColor:   tenant?.accentColor    ?? null,
    invoiceCvr:    tenant?.invoiceCvr     ?? null,
    invoiceFooter: tenant?.invoiceFooter  ?? null,
  };
}
