"use client";

import { useState, useTransition, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Building2, X } from "lucide-react";

function detectTenantSlug(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;

  // Vercel preview/prod-aliaser (fx crm-x-eight.vercel.app) er IKKE tenant-slugs.
  // Login skal her opføre sig som rod-domænet — workspace vælges manuelt.
  // Eksplicit check uanset NEXT_PUBLIC_ROOT_DOMAIN, så fejl-konfigureret env
  // ikke kan låse brugeren ude.
  if (host.endsWith(".vercel.app")) {
    return new URLSearchParams(window.location.search).get("tenant") || "";
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "plesnertech.dk";
  // Produktion: sub.plesnertech.dk
  if (host.endsWith(`.${rootDomain}`)) {
    return host.replace(`.${rootDomain}`, "");
  }
  // Dev/direkte URL: ?tenant=demo
  return new URLSearchParams(window.location.search).get("tenant") || "";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const urlError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [workspaceLocked, setWorkspaceLocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(
    urlError ? "Forkert email eller adgangskode." : null
  );
  const [isPending, startTransition] = useTransition();

  // Detektér workspace fra subdomain/URL — kører kun client-side
  useEffect(() => {
    const detected = detectTenantSlug();
    if (detected) {
      setWorkspace(detected);
      setWorkspaceLocked(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        tenantSlug: workspace.trim(),
        redirect: false,
      });

      if (result?.error) {
        setLoginError("Forkert email eller adgangskode.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  }

  const isSuperAdmin = workspace.trim() === "";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
            <span className="text-white font-bold text-lg">CX</span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Velkommen tilbage
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {workspaceLocked
              ? `Log ind på workspace · ${workspace}`
              : "Log ind på dit CRM-X workspace"}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Workspace-felt — vises kun hvis ikke låst via subdomain */}
            {!workspaceLocked && (
              <div className="space-y-1.5">
                <label htmlFor="workspace" className="text-sm font-medium text-foreground">
                  Workspace
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (tom = Super Admin)
                  </span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    id="workspace"
                    type="text"
                    value={workspace}
                    onChange={(e) => setWorkspace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="fx demo"
                    autoComplete="off"
                    autoFocus
                    tabIndex={1}
                    className="w-full pl-9 pr-9 py-2 rounded-lg border border-input bg-background text-sm
                               placeholder:text-muted-foreground font-mono
                               focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                               transition-shadow"
                  />
                  {workspace && (
                    <button
                      type="button"
                      onClick={() => setWorkspace("")}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Live indikator */}
                {workspace && (
                  <p className="text-xs text-muted-foreground pl-1">
                    Logger ind som tenant:{" "}
                    <span className="font-medium text-foreground font-mono">{workspace}</span>
                  </p>
                )}
                {!workspace && (
                  <p className="text-xs text-amber-600 pl-1">
                    Super Admin login — lad feltet være tomt
                  </p>
                )}
              </div>
            )}

            {/* Workspace-badge når låst via subdomain */}
            {workspaceLocked && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono font-medium">{workspace}</span>
                <button
                  type="button"
                  onClick={() => { setWorkspace(""); setWorkspaceLocked(false); }}
                  tabIndex={-1}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skift
                </button>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.dk"
                tabIndex={2}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm
                           placeholder:text-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                           transition-shadow"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Adgangskode
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  tabIndex={3}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-background text-sm
                             placeholder:text-muted-foreground
                             focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent
                             transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Fejlbesked */}
            {loginError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                <p className="text-sm text-destructive">{loginError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              tabIndex={4}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                         bg-primary text-primary-foreground text-sm font-medium
                         hover:bg-primary/90 active:bg-primary/80
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Logger ind..." : "Log ind"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          CRM-X · Drevet af{" "}
          <a href="https://plesnertech.dk" className="underline hover:text-foreground transition-colors">
            Plesner Tech
          </a>
        </p>
      </div>
    </div>
  );
}
