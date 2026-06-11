"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  return session;
}

export async function getLeads(opts?: { status?: string; campaignId?: string }) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const { status, campaignId } = opts ?? {};
  return db.lead.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(status ? { status } : {}),
      ...(campaignId ? { campaignId } : {}),
    },
    include: { campaign: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLead(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  return db.lead.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { campaign: { select: { id: true, name: true } } },
  });
}

export async function createLead(formData: FormData) {
  const session = await getSession();
  const lead = await db.lead.create({
    data: {
      tenantId: session.user.tenantId!,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      company: (formData.get("company") as string) || null,
      jobTitle: (formData.get("jobTitle") as string) || null,
      source: (formData.get("source") as string) || null,
      campaignId: (formData.get("campaignId") as string) || null,
      notes: (formData.get("notes") as string) || null,
      status: "new",
    },
  });
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(formData: FormData) {
  const session = await getSession();
  const id = formData.get("id") as string;
  await db.lead.updateMany({
    where: { id, tenantId: session.user.tenantId! },
    data: {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      company: (formData.get("company") as string) || null,
      jobTitle: (formData.get("jobTitle") as string) || null,
      source: (formData.get("source") as string) || null,
      status: formData.get("status") as string,
      campaignId: (formData.get("campaignId") as string) || null,
      notes: (formData.get("notes") as string) || null,
    },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function updateLeadStatus(id: string, status: string) {
  const session = await getSession();
  await db.lead.updateMany({
    where: { id, tenantId: session.user.tenantId! },
    data: { status },
  });
  revalidatePath("/leads");
}

export async function convertLeadToCompany(formData: FormData) {
  const session = await getSession();
  const leadId = formData.get("leadId") as string;
  const lead = await db.lead.findFirst({
    where: { id: leadId, tenantId: session.user.tenantId! },
  });
  if (!lead) throw new Error("Lead ikke fundet");

  // Opret firma fra lead
  const company = await db.company.create({
    data: {
      tenantId: session.user.tenantId!,
      name: lead.company || `${lead.firstName} ${lead.lastName}`,
    },
  });

  // Opret kontakt
  await db.contact.create({
    data: {
      tenantId: session.user.tenantId!,
      companyId: company.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      title: lead.jobTitle,
    },
  });

  // Marker lead som konverteret
  await db.lead.updateMany({
    where: { id: leadId, tenantId: session.user.tenantId! },
    data: { status: "converted", convertedCompanyId: company.id },
  });

  revalidatePath("/leads");
  revalidatePath("/companies");
  redirect(`/companies/${company.id}`);
}

export async function deleteLead(id: string) {
  const session = await getSession();
  await db.lead.deleteMany({ where: { id, tenantId: session.user.tenantId! } });
  revalidatePath("/leads");
  redirect("/leads");
}
