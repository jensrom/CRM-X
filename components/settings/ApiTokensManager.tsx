"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Copy, Check, Eye, EyeOff, Lock, Infinity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiToken, revokeApiToken } from "@/app/actions/api-tokens";

interface ApiToken {
  id: string;
  name: string;
  tokenPrefix?: string;
  token?: string; // kun vist ved oprettelse (klartekst)
  expiresAt: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
}

interface Props {
  tokens: ApiToken[];
  locked?: boolean;
}

export function ApiTokensManager({ tokens: initialTokens, locked = false }: Props) {
  const [tokens, setTokens] = useState<ApiToken[]>(initialTokens);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [tokenType, setTokenType] = useState<"permanent" | "temporary">("permanent");
  const [expiresAt, setExpiresAt] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createApiToken({
        name: newName.trim(),
        expiresAt: tokenType === "temporary" && expiresAt ? expiresAt : null,
      });
      if (!res.ok || !res.token) {
        setError(res.error ?? "Token kunne ikke oprettes");
        return;
      }
      const newToken: ApiToken = {
        id: res.tokenId ?? Math.random().toString(36).slice(2),
        name: newName.trim(),
        tokenPrefix: res.token.slice(-4),
        token: res.token,
        expiresAt: tokenType === "temporary" && expiresAt ? expiresAt : null,
        createdAt: new Date().toISOString(),
      };
      setTokens((prev) => [newToken, ...prev]);
      setCreatedToken(res.token);
      setNewName("");
      setCreating(false);
      setExpiresAt("");
    });
  }

  function copyToken(t: string) {
    navigator.clipboard.writeText(t);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function deleteToken(id: string) {
    if (!confirm("Tilbagekald dette API-token? Integrationer der bruger det vil holde op med at virke.")) return;
    startTransition(async () => {
      const res = await revokeApiToken(id);
      if (res.ok) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
      } else {
        setError(res.error ?? "Token kunne ikke tilbagekaldes");
      }
    });
  }

  const isExpired = (t: ApiToken) =>
    t.expiresAt ? new Date(t.expiresAt) < new Date() : false;

  return (
    <div className="space-y-5">
      {/* Oprettet token — vis én gang */}
      {createdToken && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-2">
            Token oprettet — gem det nu, det vises ikke igen
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white dark:bg-emerald-900/30 border border-emerald-200 rounded-lg px-3 py-2 font-mono text-xs overflow-x-auto">
              {showToken ? createdToken : "•".repeat(40)}
            </div>
            <button onClick={() => setShowToken((v) => !v)}
              className="p-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">
              {showToken ? <EyeOff className="h-4 w-4 text-emerald-700" /> : <Eye className="h-4 w-4 text-emerald-700" />}
            </button>
            <button onClick={() => copyToken(createdToken)}
              className="p-2 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors">
              {copied ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4 text-emerald-700" />}
            </button>
          </div>
          <button onClick={() => setCreatedToken(null)}
            className="mt-2 text-xs text-emerald-700 hover:underline">
            Jeg har gemt tokenet — luk
          </button>
        </div>
      )}

      {/* Eksisterende tokens */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h3 className="text-sm font-semibold">API-tokens ({tokens.length})</h3>
          <Button
            onClick={() => setCreating(true)}
            disabled={locked}
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Opret token
          </Button>
        </div>

        {/* Nyt token-formular */}
        {creating && (
          <div className="px-5 py-4 border-b border-border bg-secondary/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="name"
                label="Navn / beskrivelse"
                placeholder="Zapier integration, Webshop..."
                value={newName}
                onChange={(e: any) => setNewName(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Varighed</label>
                <select
                  value={tokenType}
                  onChange={(e) => setTokenType(e.target.value as "permanent" | "temporary")}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="permanent">Permanent (udløber ikke)</option>
                  <option value="temporary">Midlertidig med udløbsdato</option>
                </select>
              </div>
            </div>
            {tokenType === "temporary" && (
              <Input
                name="expiresAt"
                label="Udløbsdato"
                type="date"
                value={expiresAt}
                onChange={(e: any) => setExpiresAt(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              />
            )}
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <Button onClick={handleCreate} disabled={!newName.trim() || isPending} size="sm">
                {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opretter...</> : "Opret token"}
              </Button>
              <Button onClick={() => { setCreating(false); setNewName(""); setError(null); }} variant="ghost" size="sm">
                Annuller
              </Button>
            </div>
          </div>
        )}

        {tokens.length === 0 && !creating ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Ingen API-tokens endnu
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Navn</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Oprettet</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Udløber</th>
                <th className="w-12 px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id} className={`border-b border-border/50 last:border-0 ${isExpired(t) ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium">{t.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.tokenPrefix && (
                        <span className="text-xs font-mono text-muted-foreground">crm_•••• {t.tokenPrefix}</span>
                      )}
                      {isExpired(t) && <span className="text-xs text-destructive">Udløbet</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-xs hidden md:table-cell">
                    {new Date(t.createdAt).toLocaleDateString("da-DK")}
                  </td>
                  <td className="px-5 py-3 text-xs hidden lg:table-cell">
                    {t.expiresAt ? (
                      <span className={isExpired(t) ? "text-destructive" : "text-muted-foreground"}>
                        {new Date(t.expiresAt).toLocaleDateString("da-DK")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground/50">
                        <Infinity className="h-3 w-3" /> Permanent
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button onClick={() => deleteToken(t.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {locked && (
          <div className="px-5 py-3 border-t border-border bg-secondary/20 flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Kræver Large-pakken — kontakt os for at opgradere
          </div>
        )}
      </div>
    </div>
  );
}
