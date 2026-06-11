"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";

const MODULES = [
  { key: "sales",     label: "Salg",      icon: "💼" },
  { key: "marketing", label: "Marketing", icon: "📣" },
  { key: "support",   label: "Support",   icon: "🎫" },
  { key: "projects",  label: "Projekter", icon: "📁" },
  { key: "products",  label: "Produkter", icon: "📦" },
  { key: "licenses",  label: "Licenser",  icon: "🔑" },
] as const;

const ACTIONS = [
  { key: "view",   label: "Se" },
  { key: "create", label: "Opret" },
  { key: "edit",   label: "Rediger" },
  { key: "delete", label: "Slet" },
] as const;

type ModKey = typeof MODULES[number]["key"];
type ActKey = typeof ACTIONS[number]["key"];

type PermState = Record<ModKey | string, Record<ActKey | string, boolean>>;

function initPerms(initial: Record<string, Record<string, boolean>>): PermState {
  const p: PermState = {};
  for (const mod of MODULES) {
    p[mod.key] = {};
    for (const act of ACTIONS) {
      p[mod.key][act.key] = initial?.[mod.key]?.[act.key] ?? false;
    }
  }
  return p;
}

export function PermissionMatrix({ permissions }: { permissions: Record<string, Record<string, boolean>> }) {
  const [perms, setPerms] = useState<PermState>(() => initPerms(permissions));

  function toggle(mod: string, act: string) {
    setPerms((prev) => {
      const next = { ...prev, [mod]: { ...prev[mod], [act]: !prev[mod][act] } };
      // View er en forudsaetning for alle andre
      if (act !== "view" && next[mod][act] && !next[mod]["view"]) {
        next[mod]["view"] = true;
      }
      // Hvis view fravalgt, slaet alle fra
      if (act === "view" && !next[mod]["view"]) {
        for (const a of ACTIONS) next[mod][a.key] = false;
      }
      return next;
    });
  }

  function toggleAll(mod: string, val: boolean) {
    setPerms((prev) => {
      const modPerms: Record<string, boolean> = {};
      for (const a of ACTIONS) modPerms[a.key] = val;
      return { ...prev, [mod]: modPerms };
    });
  }

  const allOn = (mod: string) => ACTIONS.every((a) => perms[mod][a.key]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold">Rettigheder pr. modul</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Definer hvad denne rolle må se og gøre</p>
      </div>

      {/* Skjulte inputs til form submit */}
      {MODULES.map((mod) =>
        ACTIONS.map((act) => (
          <input
            key={`${mod.key}_${act.key}`}
            type="hidden"
            name={`perm_${mod.key}_${act.key}`}
            value={perms[mod.key][act.key] ? "on" : ""}
          />
        ))
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground w-44">Modul</th>
              {ACTIONS.map((act) => (
                <th key={act.key} className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-24">
                  {act.label}
                </th>
              ))}
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground text-center w-20">
                Alle
              </th>
            </tr>
          </thead>
          <tbody>
            {MODULES.map((mod, i) => (
              <tr key={mod.key} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{mod.icon}</span>
                    <span className="font-medium">{mod.label}</span>
                  </div>
                </td>
                {ACTIONS.map((act) => (
                  <td key={act.key} className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => toggle(mod.key, act.key)}
                      className={`w-7 h-7 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                        perms[mod.key][act.key]
                          ? "bg-primary border-primary text-white"
                          : "border-border hover:border-primary/50 bg-background"
                      }`}
                    >
                      {perms[mod.key][act.key] && <Check className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                ))}
                <td className="px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() => toggleAll(mod.key, !allOn(mod.key))}
                    className={`w-7 h-7 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                      allOn(mod.key)
                        ? "bg-primary border-primary text-white"
                        : "border-dashed border-border hover:border-primary/50 bg-background"
                    }`}
                  >
                    {allOn(mod.key) ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
