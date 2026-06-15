"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCreatorContext } from "@/lib/creator-context";

// Næste projekt-nummer pr. tenant
async function nextProjectNumber(tenantId: string): Promise<number> {
  const last = await db.project.findFirst({
    where: { tenantId },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

// Hent liste
export async function getProjects(opts?: {
  status?: string;
  search?: string;
  companyId?: string;
}) {
  const session = await auth();
  if (!session?.user?.tenantId) return [];
  const tenantId = session.user.tenantId;

  return db.project.findMany({
    where: {
      tenantId,
      ...(opts?.status ? { status: opts.status } : {}),
      ...(opts?.companyId ? { companyId: opts.companyId } : {}),
      ...(opts?.search
        ? { title: { contains: opts.search, mode: "insensitive" } }
        : {}),
    },
    include: {
      tenant: { select: { projectPrefix: true, bundlePrefix: true } },
      company: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      projectBundles: {
        include: { bundle: { select: { id: true, number: true, totalHours: true, usedMinutes: true, isActive: true } } },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { backlog: true, timeLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Hent enkelt projekt
export async function getProject(id: string) {
  const session = await auth();
  if (!session?.user?.tenantId) return null;
  const tenantId = session.user.tenantId;

  return db.project.findFirst({
    where: { id, tenantId },
    include: {
      tenant: { select: { projectPrefix: true, bundlePrefix: true } },
      company: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      projectBundles: {
        include: {
          bundle: {
            select: {
              id: true, number: true, name: true,
              totalHours: true, usedMinutes: true,
              isActive: true, expiresAt: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      products: { include: { product: { select: { id: true, name: true } } } },
      backlog: {
        orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
      timeLogs: {
        include: {
          user: { select: { id: true, name: true } },
          bundle: { select: { id: true, number: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

// Opret projekt
export async function createProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  const number = await nextProjectNumber(tenantId);
  const assignedToId = formData.get("assignedToId") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  const _creator = await getCreatorContext();

  const project = await db.project.create({
    data: {
      createdById: _creator.createdById,
      createdByImpersonatorId: _creator.createdByImpersonatorId,
      tenantId,
      number,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      companyId: formData.get("companyId") as string,
      assignedToId: assignedToId || null,
      status: (formData.get("status") as string) || "active",
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

// Opdater projekt
export async function updateProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;
  const id = formData.get("id") as string;

  // Lukkede projekter er låst — kun reopenProject() kan ændre status
  const existing = await db.project.findFirst({
    where: { id, tenantId },
    select: { status: true },
  });
  if (existing?.status === "closed") {
    throw new Error("Projektet er lukket og kan ikke redigeres. Genåbn det først.");
  }

  const assignedToId = formData.get("assignedToId") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  await db.project.update({
    where: { id, tenantId },
    data: {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      companyId: formData.get("companyId") as string,
      assignedToId: assignedToId || null,
      status: formData.get("status") as string,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

// Luk projekt (låser + valgfri faktura)
export async function closeProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  const projectId = formData.get("projectId") as string;
  const createInv = formData.get("createInvoice") === "true";

  // Sæt status til closed
  const project = await db.project.update({
    where: { id: projectId, tenantId },
    data: { status: "closed" },
    include: { company: { select: { id: true } } },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);

  if (createInv) {
    // Opret faktura og redirect dertil
    const lastInv = await db.invoice.findFirst({
      where: { tenantId }, orderBy: { number: "desc" }, select: { number: true },
    });
    const number = (lastInv?.number ?? 0) + 1;
    const invoice = await db.invoice.create({
      data: {
        tenantId,
        companyId: project.company.id,
        projectId: project.id,
        number,
        status: "draft",
        dueDate: new Date(Date.now() + 30 * 86400000),
      },
    });
    revalidatePath("/invoices");
    redirect(`/invoices/${invoice.id}`);
  }

  redirect(`/projects/${projectId}`);
}

// Genåbn lukket projekt — sætter status tilbage til "active"
export async function reopenProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  await db.project.update({
    where: { id: projectId, tenantId },
    data: { status: "active" },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

// Slet projekt
export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  await db.project.delete({ where: { id: projectId, tenantId } });
  revalidatePath("/projects");
  redirect("/projects");
}

// Tilknytr klippekort til projekt (med retroaktiv tildeling)
export async function assignBundleToProject(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  const projectId = formData.get("projectId") as string;
  const bundleId = formData.get("bundleId") as string;
  const applyRetroactive = formData.get("applyRetroactive") !== "false"; // standard: true

  // Verificer ejerskab
  const [project, bundle] = await Promise.all([
    db.project.findFirst({ where: { id: projectId, tenantId } }),
    db.hourBundle.findFirst({ where: { id: bundleId, tenantId } }),
  ]);
  if (!project || !bundle) throw new Error("Projekt eller klippekort ikke fundet");

  // Find næste sortOrder
  const lastPB = await db.projectBundle.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const sortOrder = (lastPB?.sortOrder ?? -1) + 1;

  await db.projectBundle.create({
    data: { tenantId, projectId, bundleId, sortOrder },
  });

  // Retroaktiv: tildel eksisterende, ikke-tilknyttede timelogs til dette klippekort
  if (applyRetroactive) {
    const unassignedLogs = await db.timeLog.findMany({
      where: { projectId, bundleId: null, tenantId },
      orderBy: { date: "asc" },
      select: { id: true, durationMin: true },
    });

    const bundleCapacityMin = bundle.totalHours * 60;
    const currentUsedMin = bundle.usedMinutes;
    let remainingCapacity = bundleCapacityMin - currentUsedMin;
    let totalDeducted = 0;

    for (const log of unassignedLogs) {
      if (remainingCapacity <= 0) break;
      const deduct = Math.min(log.durationMin, remainingCapacity);
      await db.timeLog.update({
        where: { id: log.id },
        data: { bundleId, deductedFromBundle: true },
      });
      remainingCapacity -= deduct;
      totalDeducted += deduct;
    }

    // Opdater usedMinutes på bundlet
    if (totalDeducted > 0) {
      await db.hourBundle.update({
        where: { id: bundleId },
        data: { usedMinutes: { increment: totalDeducted } },
      });
    }
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/klippekort/${bundleId}`);
}

// Fjern klippekort fra projekt
export async function removeBundleFromProject(projectBundleId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  await db.projectBundle.delete({ where: { id: projectBundleId } });
  revalidatePath(`/projects/${projectId}`);
}

// Log tid på projekt — med automatisk klippekort-fradrag
export async function logProjectTime(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.tenantId) throw new Error("Ikke autoriseret");
  const tenantId = session.user.tenantId;

  const projectId = formData.get("projectId") as string;
  const durationMin = parseInt(formData.get("durationMin") as string);
  const dateStr = formData.get("date") as string;
  const backlogItemId = (formData.get("backlogItemId") as string) || null;
  const isBillable = formData.get("isBillable") !== "false";

  // Find aktivt klippekort (lavest sortOrder med kapacitet tilbage)
  const projectBundles = await db.projectBundle.findMany({
    where: { projectId },
    include: { bundle: { select: { id: true, totalHours: true, usedMinutes: true, isActive: true, expiresAt: true } } },
    orderBy: { sortOrder: "asc" },
  });

  let bundleId: string | null = null;
  let deductedFromBundle = false;

  for (const pb of projectBundles) {
    const b = pb.bundle;
    if (!b.isActive) continue;
    if (b.expiresAt && new Date(b.expiresAt) < new Date()) continue;
    const remainingMin = b.totalHours * 60 - b.usedMinutes;
    if (remainingMin > 0) {
      bundleId = b.id;
      deductedFromBundle = true;
      break;
    }
  }

  await db.$transaction(async (tx) => {
    await tx.timeLog.create({
      data: {
        tenantId,
        userId: session.user!.id,
        projectId,
        bundleId,
        backlogItemId: backlogItemId || null,
        date: new Date(dateStr),
        durationMin,
        description: (formData.get("description") as string) || null,
        isBillable,
        deductedFromBundle,
      },
    });

    if (bundleId) {
      await tx.hourBundle.update({
        where: { id: bundleId },
        data: { usedMinutes: { increment: durationMin } },
      });
    }
  });

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

// Opdater bundleId på en specifik timelog (retroaktiv redigering)
export async function updateTimeLogBundle(
  timeLogId: string,
  newBundleId: string | null,
  projectId: string
) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");

  const log = await db.timeLog.findFirst({
    where: { id: timeLogId, tenantId: session.user.tenantId },
    select: { bundleId: true, durationMin: true, deductedFromBundle: true },
  });
  if (!log) return;

  await db.$transaction(async (tx) => {
    // Tilbagefoor fra gammelt bundle
    if (log.bundleId && log.deductedFromBundle) {
      await tx.hourBundle.update({
        where: { id: log.bundleId },
        data: { usedMinutes: { decrement: log.durationMin } },
      });
    }

    // Tildel nyt bundle
    await tx.timeLog.update({
      where: { id: timeLogId },
      data: {
        bundleId: newBundleId,
        deductedFromBundle: newBundleId !== null,
      },
    });

    // Opdat nyt bundle
    if (newBundleId) {
      await tx.hourBundle.update({
        where: { id: newBundleId },
        data: { usedMinutes: { increment: log.durationMin } },
      });
    }
  });

  revalidatePath(`/projects/${projectId}`);
}

// Backlog: opret item
export async function createBacklogItem(formData: FormData) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");

  const projectId = formData.get("projectId") as string;
  const estimateHours = formData.get("estimateHours") as string;

  await db.backlogItem.create({
    data: {
      projectId,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      priority: (formData.get("priority") as string) || "medium",
      status: "todo",
      estimateHours: estimateHours ? parseFloat(estimateHours) : null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

// Backlog: opdater status
export async function updateBacklogStatus(itemId: string, status: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");

  const item = await db.backlogItem.findFirst({
    where: { id: itemId },
    select: { projectId: true },
  });
  if (!item) return;

  await db.backlogItem.update({ where: { id: itemId }, data: { status } });
  revalidatePath(`/projects/${item.projectId}`);
}

// Backlog: slet item
export async function deleteBacklogItem(itemId: string, projectId: string) {
  const session = await auth();
  if (!session?.user?.tenantId) throw new Error("Ikke autoriseret");
  await db.backlogItem.delete({ where: { id: itemId } });
  revalidatePath(`/projects/${projectId}`);
}

// Check-in
export async function checkIn(projectId: string, backlogItemId?: string) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.tenantId) throw new Error("Ikke autoriseret");

  await db.activeCheckIn.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      projectId,
      backlogItemId: backlogItemId || null,
    },
    update: {
      projectId,
      backlogItemId: backlogItemId || null,
      startedAt: new Date(),
    },
  });

  revalidatePath(`/projects/${projectId}`);
}

// Check-out — med klippekort-fradrag
export async function checkOut() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Ikke autoriseret");

  const ci = await db.activeCheckIn.findUnique({ where: { userId: session.user.id } });
  if (!ci) return;

  const durationMin = Math.max(Math.ceil((Date.now() - new Date(ci.startedAt).getTime()) / 60000 / 5) * 5, 5);

  // Find aktivt klippekort
  const projectBundles = await db.projectBundle.findMany({
    where: { projectId: ci.projectId },
    include: { bundle: { select: { id: true, totalHours: true, usedMinutes: true, isActive: true, expiresAt: true } } },
    orderBy: { sortOrder: "asc" },
  });

  let bundleId: string | null = null;
  let deductedFromBundle = false;
  for (const pb of projectBundles) {
    const b = pb.bundle;
    if (!b.isActive) continue;
    if (b.expiresAt && new Date(b.expiresAt) < new Date()) continue;
    if (b.totalHours * 60 - b.usedMinutes > 0) {
      bundleId = b.id;
      deductedFromBundle = true;
      break;
    }
  }

  await db.$transaction([
    db.timeLog.create({
      data: {
        tenantId: ci.tenantId,
        userId: ci.userId,
        projectId: ci.projectId,
        backlogItemId: ci.backlogItemId,
        bundleId,
        date: new Date(),
        durationMin,
        isBillable: true,
        deductedFromBundle,
      },
    }),
    ...(bundleId
      ? [db.hourBundle.update({ where: { id: bundleId }, data: { usedMinutes: { increment: durationMin } } })]
      : []),
    db.activeCheckIn.delete({ where: { userId: session.user.id } }),
  ]);

  revalidatePath(`/projects/${ci.projectId}`);
}

export async function getMyCheckIn() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.activeCheckIn.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true } } },
  });
}
