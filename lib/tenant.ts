import { headers } from "next/headers";
import { db } from "./db";
import type { Tenant } from "@prisma/client";

/**
 * Henter den aktuelle tenant baseret på subdomain-header sat af middleware.
 * Bruges i Server Components og Route Handlers.
 */
export async function getCurrentTenant(): Promise<Tenant | null> {
  const headersList = await headers();
  const slug = headersList.get("x-tenant-slug");

  if (!slug) return null;

  const tenant = await db.tenant.findUnique({
    where: { slug, isActive: true },
  });

  return tenant;
}

/**
 * Henter tenant eller kaster fejl hvis ikke fundet.
 * Bruges i beskyttede routes der kræver en gyldig tenant.
 */
export async function requireTenant(): Promise<Tenant> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    throw new Error("Tenant ikke fundet eller inaktiv");
  }
  return tenant;
}

/**
 * Returnerer true hvis tenanten har det givne modul aktiveret.
 */
export function hasModule(tenant: Tenant, module: string): boolean {
  return tenant.modules.includes(module);
}

/**
 * Type-safe permission checker
 */
export type ModuleName =
  | "sales"
  | "marketing"
  | "support"
  | "projects"
  | "products"
  | "licenses";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export function checkPermission(
  permissions: Record<string, Record<string, boolean>>,
  module: ModuleName,
  action: PermissionAction
): boolean {
  return permissions?.[module]?.[action] ?? false;
}
