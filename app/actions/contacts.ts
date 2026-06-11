"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const contactSchema = z.object({
  firstName:    z.string().min(1, "Fornavn er påkrævet"),
  lastName:     z.string().min(1, "Efternavn er påkrævet"),
  email:        z.string().email("Ugyldig email").optional().or(z.literal("")),
  phone:        z.string().optional(),
  mobile:       z.string().optional(),
  title:        z.string().optional(),
  linkedInUrl:  z.string().optional(),
  decisionRole: z.string().optional(),
  companyId:    z.string().optional(),
  departmentId: z.string().optional(),
  notes:        z.string().optional(),
});

export async function createContact(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");

  const raw = Object.fromEntries(formData);
  const data = contactSchema.parse(raw);

  const contact = await db.contact.create({
    data: {
      tenantId: session.user.tenantId,
      ...data,
      email:        data.email || null,
      companyId:    data.companyId || null,
      departmentId: data.departmentId || null,
      linkedInUrl:  data.linkedInUrl || null,
      decisionRole: data.decisionRole || null,
    } as any,
  });

  revalidatePath("/contacts");
  if (data.companyId) revalidatePath(`/companies/${data.companyId}`);
  redirect(`/contacts/${contact.id}`);
}

export async function updateContact(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");

  const raw = Object.fromEntries(formData);
  const data = contactSchema.parse(raw);

  await db.contact.update({
    where: { id, tenantId: session.user.tenantId },
    data: {
      ...data,
      email:        data.email || null,
      companyId:    data.companyId || null,
      departmentId: data.departmentId || null,
      linkedInUrl:  data.linkedInUrl || null,
      decisionRole: data.decisionRole || null,
    } as any,
  });

  revalidatePath(`/contacts/${id}`);
  revalidatePath("/contacts");
  redirect(`/contacts/${id}`);
}

// Batch-import fra CSV
export async function importContactsFromCsv(
  rows: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    mobile?: string;
    title?: string;
    linkedInUrl?: string;
    decisionRole?: string;
    companyName?: string; // bruges til firma-opslag
    notes?: string;
  }[]
): Promise<{ ok: number; errors: string[] }> {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  // Byg firma-opslag én gang
  const allCompanies = await db.company.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
  });
  const companyMap = new Map(allCompanies.map((c) => [c.name.toLowerCase(), c.id]));

  let ok = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (!row.firstName || !row.lastName) continue;
    try {
      const companyId = row.companyName
        ? companyMap.get(row.companyName.toLowerCase()) ?? null
        : null;

      await (db.contact as any).create({
        data: {
          tenantId,
          firstName:    row.firstName,
          lastName:     row.lastName,
          email:        row.email        || null,
          phone:        row.phone        || null,
          mobile:       row.mobile       || null,
          title:        row.title        || null,
          linkedInUrl:  row.linkedInUrl  || null,
          decisionRole: row.decisionRole || null,
          companyId,
          notes:        row.notes        || null,
        },
      });
      ok++;
    } catch (err: any) {
      errors.push(`"${row.firstName} ${row.lastName}": ${err.message}`);
    }
  }

  revalidatePath("/contacts");
  return { ok, errors };
}

export async function getContacts(
  search?: string,
  companyId?: string,
  decisionRole?: string,
) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  return db.contact.findMany({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
      ...(companyId ? { companyId } : {}),
      ...(decisionRole ? { decisionRole } as any : {}),
      ...(search ? {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName:  { contains: search, mode: "insensitive" } },
          { email:     { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export async function getContact(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;

  return db.contact.findUnique({
    where: { id, tenantId: session.user.tenantId },
    include: {
      company: true,
      activities: { orderBy: { createdAt: "desc" }, take: 10 },
      tickets: { where: { status: { not: "closed" } }, take: 5 },
    },
  });
}
