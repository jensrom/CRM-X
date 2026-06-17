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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Sender selve faktura-mailen — via brugerens mailbox eller system-mail.
 * Markerer ogsaa invoice.status="sent" hvis status er "draft" og afsendelsen lykkes.
 */
export async function emailInvoice(invoiceId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  const { sendMail } = await import("@/lib/email");

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      company: { select: { name: true } },
      tenant:  { select: { name: true, invoicePrefix: true } },
    },
  });
  if (!invoice) throw new Error("Faktura ikke fundet");

  const via = (String(formData.get("via")) === "system" ? "system" : "user") as "system" | "user";
  const to      = String(formData.get("to") ?? "");
  const subject = String(formData.get("subject") ?? "");
  const message = String(formData.get("message") ?? "");

  if (!to || !subject) throw new Error("Modtager og emne paakraevet");

  const ref = `${invoice.tenant.invoicePrefix ?? "F"}-${String(invoice.number).padStart(4, "0")}`;
  const html = `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; color:#222;">
      <p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      <hr style="border:none; border-top:1px solid #eee; margin:24px 0;" />
      <p style="font-size:12px; color:#888;">
        Faktura ${ref} fra ${escapeHtml(invoice.tenant.name)} til ${escapeHtml(invoice.company.name)}
      </p>
    </div>
  `;
  const text = `${message}\n\n—\nFaktura ${ref} fra ${invoice.tenant.name} til ${invoice.company.name}`;

  const result = await sendMail({
    via, tenantId, userId,
    to:      to.split(",").map((s) => s.trim()).filter(Boolean),
    subject,
    html, text,
    resourceType: "invoice",
    resourceId:   invoiceId,
  });

  if (!result.success) {
    throw new Error(result.error ?? "Kunne ikke sende mail");
  }

  // Marker som sendt hvis kladde
  if (invoice.status === "draft") {
    await db.invoice.update({
      where: { id: invoiceId },
      data: { status: "sent" },
    });
  }

  revalidatePath(`/invoices/${invoiceId}`);
}

async function nextInvoiceNumber(tenantId: string): Promise<number> {
  const last = await db.invoice.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

export async function getInvoices(opts?: { companyId?: string; projectId?: string; status?: string }) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const tenantId = session.user.tenantId;

  return db.invoice.findMany({
    where: {
      tenantId,
      ...(opts?.companyId ? { companyId: opts.companyId } : {}),
      ...(opts?.projectId ? { projectId: opts.projectId } : {}),
      ...(opts?.status ? { status: opts.status } : {}),
    },
    include: {
      company: { select: { id: true, name: true } },
      project: { select: { id: true, title: true, number: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoice(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  return db.invoice.findFirst({
    where: { id, tenantId },
    include: {
      company: { select: { id: true, name: true, address: true, city: true, zipCode: true, orgNumber: true } },
      project: { select: { id: true, title: true, number: true, tenant: { select: { projectPrefix: true } } } },
      lines: { orderBy: { sortOrder: "asc" } },
      tenant: { select: { name: true, invoicePrefix: true } },
    },
  });
}

// Generer faktura fra projekt (auto-udfyld linjer fra timelogs + produkter)
export async function generateInvoiceFromProject(projectId: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const project = await db.project.findFirst({
    where: { id: projectId, tenantId },
    include: {
      company: true,
      timeLogs: {
        where: { isBillable: true },
        include: { user: { select: { name: true } } },
        orderBy: { date: "asc" },
      },
      products: {
        include: {
          product: {
            include: { pricing: { where: { interval: "onetime" } } },
          },
        },
      },
    },
  });
  if (!project) throw new Error("Projekt ikke fundet");

  const number = await nextInvoiceNumber(tenantId);

  // Beregn timelinje-pris (standard DKK 0 hvis ingen pris er sat)
  const totalBillableMin = project.timeLogs.reduce((s, l) => s + l.durationMin, 0);
  const hourlyRate = 0; // Kan sættes manuelt efterfølgende

  // Opret faktura med linjer
  const invoice = await db.invoice.create({
    data: {
      tenantId,
      companyId: project.companyId,
      projectId: project.id,
      number,
      status: "draft",
      dueDate: new Date(Date.now() + 30 * 86400000), // 30 dages betalingsfrist
      lines: {
        create: [
          // Timelinje (samlet)
          ...(totalBillableMin > 0 ? [{
            description: `Timer på projektet (${Math.round(totalBillableMin / 60 * 10) / 10}t fakturerbar)`,
            quantity: Math.round(totalBillableMin / 60 * 100) / 100,
            unitPrice: hourlyRate,
            type: "time",
            sortOrder: 0,
          }] : []),
          // Produktlinjer
          ...project.products.map((pp, idx) => ({
            description: pp.product.name,
            quantity: 1,
            unitPrice: pp.product.pricing[0]?.price ? Number(pp.product.pricing[0].price) : 0,
            type: "product",
            productId: pp.productId,
            sortOrder: idx + 1,
          })),
        ],
      },
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

// Opdater faktura-header
export async function updateInvoice(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  const id = formData.get("id") as string;

  const dueDate = formData.get("dueDate") as string;
  const vatEnabled = formData.get("vatEnabled") === "true";
  const customerType = (formData.get("customerType") as string) || "B2B";

  await db.invoice.update({
    where: { id, tenantId },
    data: {
      status: formData.get("status") as string,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: (formData.get("notes") as string) || null,
      vatEnabled,
      customerType,
    } as any,
  });

  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

// Upsert en fakturalinje
export async function upsertInvoiceLine(formData: FormData) {
  const session = await getSession();
  const invoiceId = formData.get("invoiceId") as string;
  const lineId = formData.get("lineId") as string;

  const data = {
    description: formData.get("description") as string,
    quantity: parseFloat(formData.get("quantity") as string) || 1,
    unitPrice: parseFloat(formData.get("unitPrice") as string) || 0,
    discountPct: parseFloat(formData.get("discountPct") as string) || 0,
    type: (formData.get("type") as string) || "manual",
    isCredit: formData.get("isCredit") === "true",
    sortOrder: parseInt(formData.get("sortOrder") as string) || 0,
  } as any;

  if (lineId) {
    await db.invoiceLine.update({ where: { id: lineId }, data });
  } else {
    await db.invoiceLine.create({ data: { ...data, invoiceId } });
  }

  revalidatePath(`/invoices/${invoiceId}`);
}

// Slet fakturalinje
export async function deleteInvoiceLine(lineId: string, invoiceId: string) {
  const session = await getSession();
  await db.invoiceLine.delete({ where: { id: lineId } });
  revalidatePath(`/invoices/${invoiceId}`);
}

// Slet faktura
export async function deleteInvoice(id: string) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;
  await db.invoice.deleteMany({ where: { id, tenantId } });
  revalidatePath("/invoices");
  redirect("/invoices");
}

// Opret faktura manuelt (uden projekt)
export async function createInvoice(formData: FormData) {
  const session = await getSession();
  const tenantId = session.user.tenantId!;

  const companyId = formData.get("companyId") as string;
  const projectId = (formData.get("projectId") as string) || null;
  const dueDate = formData.get("dueDate") as string;
  const notes = (formData.get("notes") as string) || null;
  const customerType = (formData.get("customerType") as string) || "B2B";
  const vatEnabled = formData.get("vatEnabled") !== "false"; // default true

  if (!companyId) throw new Error("Kunde er påkrævet");

  // B2B kræver CVR (jf. dansk faktura-standard) — advarsel hvis mangler
  if (customerType === "B2B") {
    const company = await db.company.findFirst({
      where: { id: companyId, tenantId },
      select: { orgNumber: true },
    });
    if (!company?.orgNumber) {
      throw new Error(
        "B2B-fakturær kræver kundens CVR-nummer. Tilføj CVR på kunden først, eller skift til B2C."
      );
    }
  }

  const number = await nextInvoiceNumber(tenantId);
  const { getCreatorContext } = await import("@/lib/creator-context");
  const _creator = await getCreatorContext();

  const invoice = await db.invoice.create({
    data: {
      tenantId,
      companyId,
      projectId,
      number,
      status: "draft",
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 86400000),
      notes,
      customerType,
      vatEnabled,
      createdById: _creator.createdById,
      createdByImpersonatorId: _creator.createdByImpersonatorId,
    } as any,
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}
