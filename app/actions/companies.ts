"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const companySchema = z.object({
  name:         z.string().min(1, "Navn er påkrævet"),
  orgNumber:    z.string().optional(),
  phone:        z.string().optional(),
  email:        z.string().email("Ugyldig email").optional().or(z.literal("")),
  // Separat fakturamail — kan være anderledes end den primære kontaktmail
  invoiceEmail: z.string().email("Ugyldig fakturamail").optional().or(z.literal("")),
  website:      z.string().optional(),
  address:      z.string().optional(),
  city:         z.string().optional(),
  zipCode:      z.string().optional(),
  country:      z.string().optional(),
  industry:     z.string().optional(),
  notes:        z.string().optional(),
});

export async function createCompany(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");

  const raw = Object.fromEntries(formData);
  const data = companySchema.parse(raw);

  const company = await db.company.create({
    data: {
      tenantId: session.user.tenantId,
      ...data,
      email: data.email || null,
      invoiceEmail: data.invoiceEmail || null,
      country: data.country || "Danmark",
    },
  });

  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function updateCompany(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");

  const raw = Object.fromEntries(formData);
  const data = companySchema.parse(raw);

  await db.company.update({
    where: { id, tenantId: session.user.tenantId },
    data: {
      ...data,
      email: data.email || null,
      invoiceEmail: data.invoiceEmail || null,
    },
  });

  revalidatePath(`/companies/${id}`);
  revalidatePath("/companies");
  redirect(`/companies/${id}`);
}

export async function deleteCompany(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");

  await db.company.update({
    where: { id, tenantId: session.user.tenantId },
    data: { isActive: false },
  });

  revalidatePath("/companies");
  redirect("/companies");
}

export async function getCompanies(search?: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  return db.company.findMany({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    },
    include: {
      contacts: { where: { isActive: true }, select: { id: true } },
      customerProducts: { where: { isActive: true }, include: { product: { select: { name: true } } } },
      _count: { select: { tickets: true } },
    },
    orderBy: { name: "asc" },
  });
}

// Batch-import fra CSV
export async function importCompaniesFromCsv(
  rows: {
    name: string;
    orgNumber?: string;
    industry?: string;
    phone?: string;
    email?: string;
    invoiceEmail?: string;
    website?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    country?: string;
    notes?: string;
  }[]
): Promise<{ ok: number; errors: string[] }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  let ok = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.name) continue;
    try {
      await db.company.create({
        data: {
          tenantId,
          name:         row.name,
          orgNumber:    row.orgNumber   || null,
          industry:     row.industry    || null,
          phone:        row.phone       || null,
          email:        row.email       || null,
          invoiceEmail: row.invoiceEmail || null,
          website:      row.website     || null,
          address:      row.address     || null,
          zipCode:      row.zipCode     || null,
          city:         row.city        || null,
          country:      row.country     || "Danmark",
          notes:        row.notes       || null,
        },
      });
      ok++;
    } catch (err: any) {
      errors.push(`"${row.name}": ${err.message}`);
    }
  }

  revalidatePath("/companies");
  return { ok, errors };
}

export async function getCompany(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  return db.company.findUnique({
    where: { id, tenantId: session.user.tenantId },
    include: {
      contacts: { where: { isActive: true }, orderBy: { firstName: "asc" } },
      departments: { include: { manager: true } },
      customerProducts: {
        where: { isActive: true },
        include: { product: true, department: true },
      },
      tickets: {
        where: { status: { not: "closed" } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      licenses: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}


/**
 * Komplet kunde-detalje med ALT data til tab-bar'en.
 *
 * Henter både aktive og inaktive ressourcer så hver tab kan skille
 * dem ad visuelt. Tunge listinger er beskåret med fornuftige takes.
 */
export async function getCompanyFull(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  return db.company.findFirst({
    where: { id, tenantId },
    include: {
      contacts: { where: { isActive: true }, orderBy: { firstName: "asc" } },
      departments: { include: { manager: true } },
      customerProducts: {
        include: {
          product: { include: { pricing: true } },
          department: true,
        },
        orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
      },
      licenses: {
        include: { product: { select: { id: true, name: true, type: true } } },
        orderBy: [{ expiresAt: "asc" }],
      },
      projects: {
        include: {
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { backlog: true, timeLogs: true } },
          tenant: { select: { projectPrefix: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      },
      tickets: {
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          product: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 50,
      },
      hourBundles: {
        include: {
          tenant: { select: { bundlePrefix: true } },
          projectBundles: {
            include: { project: { select: { id: true, title: true, number: true } } },
          },
        },
        orderBy: [{ isActive: "desc" }, { purchaseDate: "desc" }],
      },
      invoices: {
        include: { lines: true },
        orderBy: { issueDate: "desc" },
        take: 50,
      },
      activities: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: {
        select: { tickets: true, projects: true, invoices: true, customerProducts: true },
      },
    },
  });
}
