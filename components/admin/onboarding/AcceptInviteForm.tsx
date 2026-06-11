"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { acceptInvite } from "@/app/actions/invite";
import { Eye, EyeOff, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  token: string;
  email: string;
  defaultName: string;
  tenantSlug: string;
}

export function AcceptInviteForm({ token, email, defaultName, tenantSlug }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit =
    name.trim().length >= 2 &&
    password.length >= 12 &&
    password === confirm;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Adgangskoderne matcher ikke");
      return;
    }
    startTransition(async () => {
      const result = await acceptInvite(token, password, name);
      if (!result.ok) {
        setError(result.error ?? "Kunne ikke aktivere kontoen");
        return;
      }
      // Auto-login efter accept
      const signInRes = await signIn("credentials", {
        email,
        password,
        tenantSlug: result.tenantSlug,
        redirect: false,
      });
      if (signInRes?.ok) {
        router.push("/dashboard");
      } else {
        // Fallback: send dem til login med pre-fyldt info
        router.push(`/login?tenant=${result.tenantSlug}&email=${encodeURIComponent(email)}`);
      }
    });
  }

  // Live password-rules
  const rules = [
    { label: "Mindst 12 tegn", ok: password.length >= 12 },
    { label: "Indeholder små + store bogstaver", ok: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "Indeholder tal eller specialtegn", ok: /\d/.test(password) || /[^a-zA-Z0-9]/.test(password) },
    { label: "Matcher bekræftelse", ok: password.length > 0 && password === confirm },
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
        <input
          value={email}
          disabled
          className="w-full px-3 py-2 rounded-lg border border-input bg-secondary/50 text-sm text-muted-foreground"
        />
      </div>

      <Input
        label="Dit fulde navn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Adgangskode</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindst 12 tegn"
            required
            className="w-full px-3 py-2 pr-10 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Input
        label="Bekræft adgangskode"
        type={showPw ? "text" : "password"}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
      />

      {/* Password-policy live feedback */}
      <ul className="space-y-1 text-xs">
        {rules.map((r) => (
          <li
            key={r.label}
            className={`flex items-center gap-1.5 ${r.ok ? "text-emerald-600" : "text-muted-foreground"}`}
          >
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            {r.label}
          </li>
        ))}
      </ul>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={!canSubmit || isPending} size="lg" className="w-full">
        {isPending ? "Aktiverer…" : "Aktivér min konto og log ind"}
      </Button>

      <p className="text-[11px] text-center text-muted-foreground">
        Du kan altid aktivere to-faktor-godkendelse fra dine indstillinger efter login.
      </p>
    </form>
  );
}
