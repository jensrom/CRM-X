import { AppTopbar } from "@/components/layout/AppTopbar";
import { BackButton } from "@/components/shared/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  Mail, Check, AlertTriangle, Send, Unplug, ExternalLink, ShieldCheck, User as UserIcon,
} from "lucide-react";
import {
  updateSystemEmailConfig,
  markSystemEmailVerified,
  disconnectMyMailbox,
} from "@/app/actions/email-settings";

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) redirect("/login");
  const sp = await searchParams;

  const role = session.user.role ?? "";
  const isAdmin = ["admin", "administrator", "super_admin"].includes(role.toLowerCase());

  const [tenant, me] = await Promise.all([
    db.tenant.findFirst({
      where: { id: session.user.tenantId },
      select: {
        systemEmailDomain: true,
        systemEmailFromName: true,
        systemEmailFromAddress: true,
        systemEmailReplyTo: true,
        systemEmailVerified: true,
        systemEmailVerifiedAt: true,
        resendApiKey: true,
      },
    }),
    db.user.findFirst({
      where: { id: session.user.id },
      select: {
        emailProvider: true,
        connectedEmailAddress: true,
        emailConnectedAt: true,
      },
    }),
  ]);

  const apiKeyConfigured = !!tenant?.resendApiKey;

  return (
    <>
      <AppTopbar pageTitle="Email" />
      <BackButton href="/settings" />

      <div className="max-w-3xl space-y-5">
        <header className="mb-2">
          <h1 className="text-2xl font-semibold mb-1">Email</h1>
          <p className="text-sm text-muted-foreground">
            CRM-X sender to slags mails: <strong>system-mails</strong> via en fælles afsender (Resend) — invites,
            kvitteringer, notifikationer — og <strong>personlige mails</strong> fra din egen Outlook eller Gmail
            (OAuth) når du sender et tilbud eller en faktura til en kunde.
          </p>
        </header>

        {/* Banner-feedback efter OAuth */}
        {sp.connected && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <Check className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-900">
              Mailboks koblet — du kan nu sende mails fra <strong>{me?.connectedEmailAddress}</strong>.
            </p>
          </div>
        )}
        {sp.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-red-700 mt-0.5 shrink-0" />
            <p className="text-sm text-red-900">Mailbox-kobling fejlede: {decodeURIComponent(sp.error)}</p>
          </div>
        )}

        {/* ─── Personlig mailbox (alle brugere) ─────────────────── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <header className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold">Din mailbox</h2>
              <p className="text-xs text-muted-foreground">
                Når du sender et tilbud direkte til en kunde, afsendes mailen fra din egen mailadresse.
              </p>
            </div>
          </header>

          {me?.emailProvider ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Check className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {me.connectedEmailAddress}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Koblet via {me.emailProvider === "microsoft" ? "Microsoft 365" : "Google Workspace"}
                    {me.emailConnectedAt && ` · siden ${new Date(me.emailConnectedAt).toLocaleDateString("da-DK")}`}
                  </p>
                </div>
              </div>
              <form action={disconnectMyMailbox}>
                <Button type="submit" size="sm" variant="ghost">
                  <Unplug className="h-3.5 w-3.5" /> Afkobl
                </Button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="/api/auth/email/microsoft"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Microsoft 365</p>
                  <p className="text-xs text-muted-foreground">Outlook, Exchange, Office 365</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
              <a
                href="/api/auth/email/google"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Google Workspace</p>
                  <p className="text-xs text-muted-foreground">Gmail, G Suite</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          )}
        </section>

        {/* ─── System-mail (kun admin) ──────────────────────────── */}
        {isAdmin && (
          <section className="bg-card border border-border rounded-xl p-5">
            <header className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Send className="h-4 w-4 text-violet-700" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold flex items-center gap-2">
                  System-mail
                  {tenant?.systemEmailVerified && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      <ShieldCheck className="h-2.5 w-2.5" /> Verificeret
                    </span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Resend-baseret afsendelse til invites, kvitteringer og notifikationer.
                  <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-primary hover:underline ml-1">
                    Verificer dit domæne hos Resend →
                  </a>
                </p>
              </div>
            </header>

            <form action={updateSystemEmailConfig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Domæne</label>
                  <Input
                    name="systemEmailDomain"
                    placeholder="plesnertech.dk"
                    defaultValue={tenant?.systemEmailDomain ?? ""}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Afsender-navn</label>
                  <Input
                    name="systemEmailFromName"
                    placeholder="Plesner Tech CRM"
                    defaultValue={tenant?.systemEmailFromName ?? ""}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Afsender-adresse</label>
                  <Input
                    name="systemEmailFromAddress"
                    placeholder="noreply@plesnertech.dk"
                    defaultValue={tenant?.systemEmailFromAddress ?? ""}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Reply-To (valgfri)</label>
                  <Input
                    name="systemEmailReplyTo"
                    placeholder="kontakt@plesnertech.dk"
                    defaultValue={tenant?.systemEmailReplyTo ?? ""}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Resend API-key</label>
                <Input
                  name="resendApiKey"
                  type="password"
                  placeholder={apiKeyConfigured ? "•••••••• (gemt — efterlad tom for at beholde)" : "re_xxxxxxxx"}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Krypteres med AES-256-GCM før lagring. Klartekst gemmes aldrig.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Alle felter er valgfri — uden konfiguration falder system tilbage til env-variabler.
                </p>
                <Button type="submit" size="sm">Gem</Button>
              </div>
            </form>

            {/* Verificer-toggle */}
            <form action={markSystemEmailVerified} className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {tenant?.systemEmailVerified
                  ? `Markeret som verificeret ${tenant.systemEmailVerifiedAt ? "den " + new Date(tenant.systemEmailVerifiedAt).toLocaleDateString("da-DK") : ""}`
                  : "Markér som verificeret når du har bekræftet DKIM/SPF i Resend-dashboard"}
              </p>
              <input type="hidden" name="verified" value={tenant?.systemEmailVerified ? "false" : "true"} />
              <Button type="submit" size="sm" variant="ghost">
                {tenant?.systemEmailVerified ? "Fjern verifikation" : "Markér verificeret"}
              </Button>
            </form>
          </section>
        )}

        {/* Sikkerheds-info */}
        <p className="text-xs text-muted-foreground px-1">
          OAuth-tokens og API-keys lagres krypteret. CRM-X kan kun sende mails — vi læser ikke din indbakke.
          Du kan afkoble når som helst. Sat <code>EMAIL_TOKEN_KEY</code> i env for kryptering i prod.
        </p>
      </div>
    </>
  );
}
