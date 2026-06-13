/**
 * GET /admin/tenants/:id/export
 *
 * GDPR Art. 20 (data-portabilitet) på tenant-niveau.
 * Returnerer en komplet JSON-dump af tenant'ens data.
 *
 * Adgang: super_admin
 * Audit: hver eksport logges som "export" på tenant'en
 *
 * Bemærk: store tenants kan give MB-store JSON-filer. Vi streamer
 * ikke endnu — første version bygger objekt i memory og returnerer
 * det som application/json med download-hint.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notFound } from "next/navigation";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true, email: true, name: true, isActive: true,
          mfaEnabled: true, createdAt: true, lastLogin: true,
          // Felter med PII men IKKE password/secret
        },
      },
      roles: true,
      companies: {
        include: {
          contacts: true,
          departments: true,
          customerProducts: true,
        },
      },
      products: { include: { pricing: true } },
      tickets: { include: { comments: true, timeLogs: true } },
      projects: {
        include: { backlog: true, timeLogs: true, projectBundles: true, products: true },
      },
      hourBundles: true,
      licenses: { include: { files: { select: { id: true, name: true, url: true, size: true, uploadedAt: true } } } },
      campaigns: { include: { leads: true } },
      leads: true,
      activities: true,
      deals: true,
      invoices: { include: { lines: true } },
      bundlePricing: true,
      apiTokens: {
        select: {
          // Vi eksporterer IKKE tokenHash — det er en hemmelighed
          id: true, name: true, tokenPrefix: true, scopes: true,
          expiresAt: true, lastUsedAt: true, isActive: true, createdAt: true,
        },
      },
    },
  });

  if (!tenant) return NextResponse.json({ error: "Tenant ikke fundet" }, { status: 404 });

  // Audit eksporten
  await audit({
    tenantId: tenant.id,
    actorId: session.user.id ?? null,
    actorEmail: session.user.email ?? null,
    action: "export",
    resourceType: "tenant",
    resourceId: tenant.id,
    message: `Fuld tenant-data eksporteret som JSON (${tenant.users.length} brugere, ${tenant.companies.length} kunder, ${tenant.tickets.length} tickets)`,
  });

  // Audit-log er ikke inkluderet i selve dumpet (det er meta-data om eksporten),
  // men vi inkluderer rettighedsdata + manifest.
  const auditLogs = await db.auditLog.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "desc" },
    take: 5000, // Hard cap for at undgå ekstreme exports
  });

  const dump = {
    _meta: {
      exportedAt: new Date().toISOString(),
      exportedBy: session.user.email ?? null,
      schemaVersion: 1,
      gdprBasis: "Art. 20 — data-portabilitet",
      excludes: ["users.password", "users.mfaSecret", "users.mfaRecoveryCodes", "apiTokens.tokenHash"],
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      modules: tenant.modules,
      status: tenant.status,
      billingCurrency: tenant.billingCurrency,
      cvr: tenant.cvr,
      industry: tenant.industry,
      country: tenant.country,
      createdAt: tenant.createdAt,
    },
    users: tenant.users,
    roles: tenant.roles,
    companies: tenant.companies,
    products: tenant.products,
    tickets: tenant.tickets,
    projects: tenant.projects,
    hourBundles: tenant.hourBundles,
    licenses: tenant.licenses,
    campaigns: tenant.campaigns,
    leads: tenant.leads,
    activities: tenant.activities,
    deals: tenant.deals,
    invoices: tenant.invoices,
    bundlePricing: tenant.bundlePricing,
    apiTokens: tenant.apiTokens,
    auditLogs,
  };

  const filename = `crmx-export-${tenant.slug}-${new Date().toISOString().slice(0, 10)}.json`;
  const body = JSON.stringify(dump, null, 2);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
