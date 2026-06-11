/**
 * CRM-X — Beslutningsmandat (decisionRole) på kontakter
 *
 * Single source of truth for hvilke beslutningsroller en kontakt kan have.
 * Bruges som dropdown i form + filter i kontakt-liste + badge på detalje-side.
 *
 * Skemafelt: Contact.decisionRole (string, nullable).
 */

export type DecisionRoleSlug =
  | "none"
  | "influencer"
  | "decision_maker"
  | "budget_holder"
  | "champion";

export interface DecisionRoleDefinition {
  slug: DecisionRoleSlug;
  label: string;
  shortLabel: string;
  badgeClass: string;
}

export const DECISION_ROLES: Record<DecisionRoleSlug, DecisionRoleDefinition> = {
  none: {
    slug: "none",
    label: "Ingen beslutningsmandat",
    shortLabel: "Ingen",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
  influencer: {
    slug: "influencer",
    label: "Påvirker beslutningen",
    shortLabel: "Påvirker",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  decision_maker: {
    slug: "decision_maker",
    label: "Beslutningstager",
    shortLabel: "Beslutter",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  budget_holder: {
    slug: "budget_holder",
    label: "Budgetansvarlig",
    shortLabel: "Budget",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  champion: {
    slug: "champion",
    label: "Intern fortaler / Champion",
    shortLabel: "Champion",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
};

export const DECISION_ROLE_LIST: DecisionRoleDefinition[] = Object.values(DECISION_ROLES);

export function getDecisionRole(slug: string | null | undefined): DecisionRoleDefinition | null {
  if (!slug) return null;
  return DECISION_ROLES[slug as DecisionRoleSlug] ?? null;
}
