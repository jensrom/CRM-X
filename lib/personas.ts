/**
 * lib/personas.ts — Persona-engine til personlige dashboards.
 *
 * En persona bestemmer hvilke widgets en bruger ser FØRST paa sit dashboard.
 * Vi auto-detekter persona baseret paa rolle + 90 dages aktivitet, saa der
 * ikke kraeves manuel konfiguration.
 *
 * 3 personaer:
 *   - sales:   Saelger / account exec — leads, deals, pipeline, tilbud, targets
 *   - tech:    Tekniker / konsulent — tickets, projekter, klippekort, timer
 *   - leader:  Admin / leder med direct reports — team-performance, forecast
 *
 * Algoritme:
 *   1. Hvis User.role.name matcher "admin" eller "leder" → leader
 *   2. Hvis seneste 90d aktivitet er > 60% sales-relateret → sales
 *   3. Hvis seneste 90d aktivitet er > 60% tech-relateret → tech
 *   4. Fallback (lige fordeling eller ingen aktivitet) → matcher User.title:
 *      - "saelger" / "account" / "sales" → sales
 *      - "konsulent" / "tekniker" / "developer" → tech
 *      - "administrator" / "manager" → leader
 *   5. Sidste fallback → "sales" (bredeste default for CRM)
 */

import { db } from "@/lib/db";

export type Persona = "sales" | "tech" | "leader";

const LEADER_ROLE_KEYWORDS = ["admin", "leder", "ejer", "owner", "manager", "direktoer"];
const SALES_TITLE_KEYWORDS = ["saelger", "sales", "account", "kundechef"];
const TECH_TITLE_KEYWORDS  = ["konsulent", "tekniker", "developer", "support", "engineer"];

export async function detectPersona(opts: {
  userId: string;
  tenantId: string;
  roleName?: string | null;
  title?: string | null;
}): Promise<Persona> {
  const { userId, tenantId, roleName, title } = opts;
  const normRole  = (roleName ?? "").toLowerCase();
  const normTitle = (title ?? "").toLowerCase();

  // Step 1: eksplicit leder-rolle
  if (LEADER_ROLE_KEYWORDS.some((k) => normRole.includes(k))) return "leader";

  // Step 2: 90d aktivitets-baseret detektion
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const [salesCount, techCount] = await Promise.all([
    countSalesActivity(userId, tenantId, since),
    countTechActivity(userId, tenantId, since),
  ]);
  const total = salesCount + techCount;
  if (total >= 3) {
    if (salesCount / total > 0.6) return "sales";
    if (techCount  / total > 0.6) return "tech";
  }

  // Step 3: title-baseret fallback
  if (SALES_TITLE_KEYWORDS.some((k) => normTitle.includes(k))) return "sales";
  if (TECH_TITLE_KEYWORDS.some((k)  => normTitle.includes(k))) return "tech";

  // Step 4: sidste fallback
  return "sales";
}

async function countSalesActivity(userId: string, tenantId: string, since: Date): Promise<number> {
  const [leads, deals, quotes] = await Promise.all([
    db.lead.count({ where: { tenantId, assignedToId: userId, updatedAt: { gte: since } } }),
    db.deal.count({ where: { tenantId, assignedToId: userId, updatedAt: { gte: since } } }),
    db.quote.count({ where: { tenantId, assignedToId: userId, updatedAt: { gte: since } } }),
  ]);
  return leads + deals + quotes;
}

async function countTechActivity(userId: string, tenantId: string, since: Date): Promise<number> {
  const [tickets, projects, bundles, timeLogs] = await Promise.all([
    db.ticket.count({ where: { tenantId, assignedToId: userId, updatedAt: { gte: since } } }),
    db.project.count({ where: { tenantId, assignedToId: userId, updatedAt: { gte: since } } }),
    db.hourBundle.count({ where: { tenantId, assignedToId: userId, updatedAt: { gte: since } } }),
    db.timeLog.count({ where: { userId, createdAt: { gte: since } } }),
  ]);
  return tickets + projects + bundles + timeLogs;
}

export const PERSONA_LABELS: Record<Persona, string> = {
  sales:  "Salg",
  tech:   "Teknik",
  leader: "Leder",
};

export const PERSONA_DESCRIPTIONS: Record<Persona, string> = {
  sales:  "Mine leads, deals, tilbud og målsætning",
  tech:   "Mine tickets, projekter, klippekort og timer",
  leader: "Team-performance og samlet forecast",
};
