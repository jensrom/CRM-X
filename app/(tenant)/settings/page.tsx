import { AppTopbar } from "@/components/layout/AppTopbar";
import { PageHeader } from "@/components/shared/PageHeader";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateMyProfile } from "@/app/actions/settings";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Users, ChevronRight, ShieldCheck, ScrollText, KeyRound, Scissors, FileText, Code2, Mail, CreditCard } from "lucide-react";
import Link from "next/link";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { normalizeLocale } from "@/lib/i18n";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;

  // Hent fuld bruger-profil
  // NB: phone/title kræver migrering — vi læser hele rowen og caster, så
  //     siden ikke crasher hvis Prisma-klienten endnu ikke er regenereret.
  const dbUser = user?.id
    ? await db.user.findUnique({
        where: { id: user.id },
        select: { id: true, name: true, email: true },
      })
    : null;

  // Hent valgfrie profil-felter separat — fejler stille hvis kolonnerne ikke findes endnu
  const dbUserProfile = user?.id
    ? await db.user
        .findUnique({
          where: { id: user.id },
          select: { phone: true, title: true } as any,
        } as any)
        .catch(() => null)
    : null;

  return (
    <>
      <AppTopbar pageTitle="Indstillinger" />
      <PageHeader title="Indstillinger" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-4xl">

        {/* Min profil */}
        <div className="xl:col-span-2">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Min profil
            </h3>
            <form action={updateMyProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input name="firstName" label="Fornavn" defaultValue={(dbUser?.name ?? "").split(" ")[0]} required />
                <Input name="lastName" label="Efternavn" defaultValue={(dbUser?.name ?? "").split(" ").slice(1).join(" ")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input name="phone" label="Telefon" type="tel" placeholder="+45 12 34 56 78"
                  defaultValue={(dbUserProfile as any)?.phone ?? ""} />
                <Input name="title" label="Stilling / Titel" placeholder="Account Manager"
                  defaultValue={(dbUserProfile as any)?.title ?? ""} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Email</label>
                <input value={user?.email ?? ""} disabled
                  className="w-full px-3 py-2 rounded-lg border border-input bg-secondary text-sm opacity-60" />
                <p className="text-xs text-muted-foreground pl-1">Email kan kun ændres af en administrator</p>
              </div>
              <Button type="submit" size="md">Gem profil</Button>
            </form>
          </div>

          {/* Sprog-vælger — gemmes med det samme */}
          <div className="mt-6">
            <LanguageSelector
              currentLocale={normalizeLocale((user as any)?.language)}
            />
          </div>

          {/* Tema-vælger */}
          <div className="mt-6">
            <ThemeToggle initial={((user as any)?.theme as any) ?? "system"} />
          </div>
        </div>

        {/* Genveje */}
        <div className="xl:col-span-1 space-y-3">
          <Link href="/settings/roles"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Roller og rettigheder</p>
                <p className="text-xs text-muted-foreground">Administrer adgangsniveauer</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/users"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Brugerstyring</p>
                <p className="text-xs text-muted-foreground">Tildel roller til brugere</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/pricing"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Scissors className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Klippekort-priser</p>
                <p className="text-xs text-muted-foreground">Volumen-trin og timepris</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/mfa"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">To-faktor-godkendelse</p>
                <p className="text-xs text-muted-foreground">Beskyt din konto med TOTP</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/compliance"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Compliance &amp; GDPR</p>
                <p className="text-xs text-muted-foreground">Dataeksport, sletning, kundeanmodninger</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/audit"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ScrollText className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Audit-log</p>
                <p className="text-xs text-muted-foreground">Sporbarhed af alle handlinger</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/invoice-config"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Faktura konfiguration</p>
                <p className="text-xs text-muted-foreground">Logo, CVR, EAN, afsenderinfo</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/email"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Email</p>
                <p className="text-xs text-muted-foreground">Kobl din mailbox + system-mail-konfiguration</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/billing"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Billing & abonnement</p>
                <p className="text-xs text-muted-foreground">Plan, betaling, kvitteringer</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

                    <Link href="/settings/api"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Code2 className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">API-tokens</p>
                <p className="text-xs text-muted-foreground">Bearer-tokens til integrationer</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/audit"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <ScrollText className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Audit-log</p>
                <p className="text-xs text-muted-foreground">Spor alle handlinger</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/invoice-config"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <FileText className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Faktura-konfiguration</p>
                <p className="text-xs text-muted-foreground">Afsender, EAN, betalingsinfo</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link href="/settings/compliance"
            className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">Compliance</p>
                <p className="text-xs text-muted-foreground">GDPR + audit</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </>
  );
}
