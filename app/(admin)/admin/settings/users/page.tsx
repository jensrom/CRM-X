import {
  listSuperAdmins,
  createSuperAdmin,
  deleteSuperAdmin,
  resetSuperAdminPassword,
} from "@/app/actions/admin-users";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import {
  Users,
  Plus,
  Trash2,
  Key,
  CheckCircle2,
  XCircle,
  Shield,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    created?: string;
    deleted?: string;
    passwordReset?: string;
  }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "super_admin") redirect("/login");

  const sp = (await (searchParams ?? Promise.resolve({}))) as {
    error?: string;
    created?: string;
    deleted?: string;
    passwordReset?: string;
  };

  const admins = await listSuperAdmins();
  const currentEmail = session.user.email;

  return (
    <div className="space-y-6">
      {/* Toast-bar: feedback */}
      {sp.created && (
        <Banner
          variant="success"
          title={`Super-admin "${sp.created}" oprettet`}
          description="Brugeren kan logge ind nu via /login (lad workspace-feltet være tomt)."
        />
      )}
      {sp.deleted && (
        <Banner variant="success" title={`Super-admin "${sp.deleted}" slettet`} />
      )}
      {sp.passwordReset && (
        <Banner
          variant="success"
          title={`Password nulstillet for "${sp.passwordReset}"`}
          description="Brugeren skal bruge det nye password ved næste login."
        />
      )}
      {sp.error && (
        <Banner variant="error" title="Handlingen kunne ikke gennemføres" description={sp.error} />
      )}

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Super-admin brugere</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Brugere med fuld adgang til platform-niveau (alle tenants).
            <strong className="text-foreground"> Behandl med varsomhed.</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground tabular-nums">
            {admins.length} {admins.length === 1 ? "super-admin" : "super-admins"}
          </span>
        </div>
      </div>

      {/* Sikkerheds-info */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold">Super-admin = platform-niveau adgang</p>
          <ul className="text-xs space-y-0.5 list-disc list-inside opacity-90">
            <li>Kan se og redigere data på <strong>tværs af alle tenants</strong></li>
            <li>Kan impersonere tenant-brugere (med audit-trail)</li>
            <li>Kan oprette, suspendere og slette tenants</li>
            <li>Alle handlinger logges i audit-log</li>
          </ul>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Eksisterende super-admins
          </h3>
        </div>
        {admins.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Ingen super-admins endnu</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/30 border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-5 py-2.5 font-semibold">Navn</th>
                <th className="text-left px-5 py-2.5 font-semibold">Email</th>
                <th className="text-left px-5 py-2.5 font-semibold">Oprettet</th>
                <th className="text-right px-5 py-2.5 font-semibold">Handlinger</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => {
                const isMe = a.email === currentEmail;
                return (
                  <tr key={a.id} className="border-b border-border/50 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                          {a.name
                            .split(" ")
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase())
                            .join("")}
                        </div>
                        <span className="font-medium">{a.name}</span>
                        {isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            DIG
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{a.email}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <details className="relative">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-secondary/40">
                            <Key className="h-3 w-3" />
                            Reset password
                          </summary>
                          <form
                            action={resetSuperAdminPassword}
                            className="absolute right-0 top-full mt-1 z-10 w-80 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2"
                          >
                            <input type="hidden" name="id" value={a.id} />
                            <p className="text-[10px] text-muted-foreground">
                              Min 12 tegn · 3 af 4 klasser
                            </p>
                            <input
                              type="password"
                              name="password"
                              required
                              minLength={12}
                              placeholder="Nyt password"
                              className="w-full px-2 py-1.5 border border-border rounded-md bg-card text-xs"
                            />
                            <button
                              type="submit"
                              className="w-full px-2 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90"
                            >
                              Nulstil password
                            </button>
                          </form>
                        </details>
                        {!isMe && (
                          <form action={deleteSuperAdmin.bind(null, a.id)}>
                            <button
                              type="submit"
                              title="Slet super-admin"
                              className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3 w-3" />
                              Slet
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Opret ny */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Opret ny super-admin
          </h3>
          <p className="text-[10px] text-muted-foreground">Min 12 tegn · 3 af 4 klasser</p>
        </div>

        <form action={createSuperAdmin} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Fulde navn
            </label>
            <input
              name="name"
              required
              placeholder="fx Jens Plesner"
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="jens@plesnertech.dk"
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={12}
              placeholder="Min 12 tegn — fx Velkommen2026!"
              className="w-full px-3 py-2 border border-border rounded-md bg-card text-sm font-mono"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 inline-flex items-center gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Opret super-admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Banner({
  variant,
  title,
  description,
}: {
  variant: "success" | "error";
  title: string;
  description?: string;
}) {
  const colors =
    variant === "success"
      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
      : "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800";
  const textColors =
    variant === "success"
      ? "text-emerald-900 dark:text-emerald-200"
      : "text-rose-900 dark:text-rose-200";
  const Icon = variant === "success" ? CheckCircle2 : XCircle;
  const iconColor =
    variant === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <div className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${colors}`}>
      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColor}`} />
      <div className={`flex-1 min-w-0 ${textColors}`}>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs mt-0.5 opacity-90 break-words">{description}</p>}
      </div>
    </div>
  );
}
