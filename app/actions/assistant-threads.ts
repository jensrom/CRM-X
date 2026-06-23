"use server";

/**
 * Assistant threads — persistent samtale-historik.
 *
 * Hver thread er ejet af enten en User (tenant-bruger) eller en SuperAdmin.
 * Vi bruger ownerEmail + ownerKind som lookup-key fordi SuperAdmin ikke
 * er en del af User-tabellen.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  parseAssistantInput,
  isDestructiveAction,
  type AssistantIntent,
  type AssistantAction,
} from "@/lib/assistant";
import { askAssistant, executeConfirmedAction } from "./assistant";

/**
 * Hent owner-context fra session — tenant-user eller super-admin.
 * Throw'er hvis ingen valid session.
 */
async function getOwnerContext() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("Ikke autoriseret");
  const isSuperAdmin = session.user.role === "super_admin";
  return {
    email: session.user.email,
    kind: isSuperAdmin ? "super_admin" : "user",
    tenantId: session.user.tenantId ?? null,
  };
}

/** Liste over brugerens egne traade — pinned øverst, sorteret efter senest opdateret. */
export async function listMyThreads() {
  const owner = await getOwnerContext();
  return db.assistantThread.findMany({
    where: { ownerEmail: owner.email, ownerKind: owner.kind },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      pinned: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
    take: 50,
  });
}

/** Hent en specifik thread + alle dens beskeder. */
export async function getThread(threadId: string) {
  const owner = await getOwnerContext();
  const thread = await db.assistantThread.findFirst({
    where: {
      id: threadId,
      ownerEmail: owner.email,
      ownerKind: owner.kind,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  return thread; // null hvis ikke fundet eller ikke ejer
}

/**
 * Opret en ny thread og returnér ID.
 * Brugen i UI: brugeren skriver første besked → vi opretter thread + tilføjer besked + svar.
 */
export async function createThread(opts?: { title?: string }) {
  const owner = await getOwnerContext();
  const thread = await db.assistantThread.create({
    data: {
      ownerEmail: owner.email,
      ownerKind: owner.kind,
      tenantId: owner.tenantId,
      title: opts?.title ?? "Ny samtale",
    },
  });
  return thread.id;
}

/** Tilføj en besked til en thread + opdater updatedAt. */
async function appendMessage(
  threadId: string,
  role: "user" | "assistant",
  text: string,
  variant?: string,
  intentJson?: any,
) {
  await db.assistantMessage.create({
    data: { threadId, role, text, variant, intentJson: intentJson ?? undefined },
  });
  await db.assistantThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
}

/** Generer en kort titel fra første brugerbesked (max 50 tegn). */
function autoTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 50) return cleaned;
  return cleaned.slice(0, 47) + "...";
}

/**
 * Send en besked i en thread — opretter thread hvis den ikke findes.
 * Returner { threadId, assistantReply } så UI kan fortsætte uden refresh.
 */
export async function sendThreadMessage(args: {
  threadId?: string | null;
  text: string;
}): Promise<{
  threadId: string;
  userMessage: { id: string; text: string; createdAt: Date };
  assistantMessage: {
    id: string;
    text: string;
    variant: string;
    intentJson: any;
    createdAt: Date;
  };
}> {
  const owner = await getOwnerContext();
  const text = args.text.trim();
  if (!text) throw new Error("Tom besked");

  // Find eller opret thread
  let threadId = args.threadId;
  let isNewThread = false;
  if (!threadId) {
    isNewThread = true;
    const t = await db.assistantThread.create({
      data: {
        ownerEmail: owner.email,
        ownerKind: owner.kind,
        tenantId: owner.tenantId,
        title: autoTitle(text),
      },
    });
    threadId = t.id;
  } else {
    // Verificer ownership
    const existing = await db.assistantThread.findFirst({
      where: { id: threadId, ownerEmail: owner.email, ownerKind: owner.kind },
      select: { id: true, title: true, _count: { select: { messages: true } } },
    });
    if (!existing) throw new Error("Thread ikke fundet");
    // Hvis tråden var tom og hedder "Ny samtale", auto-genericér titlen
    if (existing._count.messages === 0 && existing.title === "Ny samtale") {
      await db.assistantThread.update({
        where: { id: threadId },
        data: { title: autoTitle(text) },
      });
    }
  }

  // Gem bruger-besked
  const userMsg = await db.assistantMessage.create({
    data: { threadId, role: "user", text },
  });

  // Kør assistent
  let assistantText = "";
  let variant: string = "info";
  let intentJson: any = null;

  // Hvis tenant-kontekst mangler (super-admin uden impersonation) skifter vi
  // til "info"-svar i stedet for at fejle.
  if (!owner.tenantId) {
    assistantText =
      "Jeg kan ikke udføre opslag eller actions uden tenant-kontekst. Start først en impersonation-session på en kunde.";
    variant = "info";
    intentJson = { type: "text", message: assistantText };
  } else {
    try {
      const reply = await askAssistant(text);
      const intent = reply.intent;
      if (intent.type === "help") {
        assistantText = intent.message;
        variant = "help";
      } else if (intent.type === "error") {
        assistantText = intent.message;
        variant = "error";
      } else if (intent.type === "text") {
        assistantText = intent.message;
        variant = "info";
      } else if (intent.type === "lookup") {
        assistantText = intent.preview;
        variant = reply.ok ? "info" : "error";
      } else if (intent.type === "action") {
        // SMART CONFIRMATION: destruktive actions kraever brugerens [Godkend]
        // foer eksekvering. Vi gemmer intent + variant="pending" og lader
        // UI vise knapperne. confirmThreadAction() kalder executor.
        if (isDestructiveAction(intent.action) && !reply.appliedChange) {
          assistantText = intent.preview;
          variant = "pending";
        } else {
          assistantText = intent.preview;
          variant = reply.ok ? "success" : "error";
        }
      }
      intentJson = { intent, ok: reply.ok, appliedChange: reply.appliedChange };
    } catch (e: any) {
      assistantText = e?.message ?? "Noget gik galt";
      variant = "error";
      intentJson = { error: e?.message };
    }
  }

  const assistantMsg = await db.assistantMessage.create({
    data: { threadId, role: "assistant", text: assistantText, variant, intentJson },
  });

  await db.assistantThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });

  revalidatePath("/admin/assistant");
  revalidatePath("/assistant");

  return {
    threadId,
    userMessage: { id: userMsg.id, text: userMsg.text, createdAt: userMsg.createdAt },
    assistantMessage: {
      id: assistantMsg.id,
      text: assistantMsg.text,
      variant,
      intentJson,
      createdAt: assistantMsg.createdAt,
    },
  };
}

/** Skift titel på en thread. */
export async function renameThread(threadId: string, newTitle: string) {
  const owner = await getOwnerContext();
  const title = newTitle.trim().slice(0, 100);
  if (!title) throw new Error("Tom titel");
  await db.assistantThread.updateMany({
    where: { id: threadId, ownerEmail: owner.email, ownerKind: owner.kind },
    data: { title },
  });
  revalidatePath("/admin/assistant");
}

/** Pin/unpin en thread. */
export async function setThreadPinned(threadId: string, pinned: boolean) {
  const owner = await getOwnerContext();
  await db.assistantThread.updateMany({
    where: { id: threadId, ownerEmail: owner.email, ownerKind: owner.kind },
    data: { pinned },
  });
  revalidatePath("/admin/assistant");
}

/**
 * Bekraeft en pending destruktiv action: finder beskeden, henter intent fra
 * intentJson, kalder executor og opdaterer beskeden + tilfoejer resultat-besked.
 */
export async function confirmThreadAction(messageId: string): Promise<{
  ok: boolean;
  resultMessage: {
    id: string;
    text: string;
    variant: string;
    createdAt: Date;
  };
}> {
  const owner = await getOwnerContext();
  const msg = await db.assistantMessage.findUnique({
    where: { id: messageId },
    include: { thread: { select: { ownerEmail: true, ownerKind: true } } },
  });
  if (!msg) throw new Error("Besked ikke fundet");
  if (msg.thread.ownerEmail !== owner.email || msg.thread.ownerKind !== owner.kind) {
    throw new Error("Ikke autoriseret");
  }
  if (msg.variant !== "pending") {
    throw new Error("Besked er ikke en pending action");
  }
  const intent = (msg.intentJson as any)?.intent;
  if (!intent || intent.type !== "action") {
    throw new Error("Pending intent mangler");
  }

  // Marker pending som godkendt visuelt (skifter variant)
  await db.assistantMessage.update({
    where: { id: messageId },
    data: { variant: "confirmed" },
  });

  // Eksekver
  const result = await executeConfirmedAction(intent.action as AssistantAction);
  const resultText = result.ok
    ? (result.intent.type === "action" ? result.intent.preview : "Udfoert")
    : (result.error ?? "Kunne ikke gennemfoere handlingen");

  const newMsg = await db.assistantMessage.create({
    data: {
      threadId: msg.threadId,
      role: "assistant",
      text: resultText,
      variant: result.ok ? "success" : "error",
      intentJson: { intent: result.intent, ok: result.ok, appliedChange: result.appliedChange },
    },
  });
  await db.assistantThread.update({
    where: { id: msg.threadId },
    data: { updatedAt: new Date() },
  });
  revalidatePath("/admin/assistant");
  revalidatePath("/assistant");

  return {
    ok: result.ok,
    resultMessage: {
      id: newMsg.id,
      text: newMsg.text,
      variant: newMsg.variant ?? "info",
      createdAt: newMsg.createdAt,
    },
  };
}

/** Annullér en pending action — markerer beskeden som "cancelled". */
export async function cancelThreadAction(messageId: string): Promise<void> {
  const owner = await getOwnerContext();
  const msg = await db.assistantMessage.findUnique({
    where: { id: messageId },
    include: { thread: { select: { ownerEmail: true, ownerKind: true } } },
  });
  if (!msg) return;
  if (msg.thread.ownerEmail !== owner.email || msg.thread.ownerKind !== owner.kind) return;
  if (msg.variant !== "pending") return;
  await db.assistantMessage.update({
    where: { id: messageId },
    data: { variant: "cancelled" },
  });
  revalidatePath("/admin/assistant");
  revalidatePath("/assistant");
}

/** Slet en thread + alle dens beskeder (cascade). */
export async function deleteThread(threadId: string) {
  const owner = await getOwnerContext();
  await db.assistantThread.deleteMany({
    where: { id: threadId, ownerEmail: owner.email, ownerKind: owner.kind },
  });
  revalidatePath("/admin/assistant");
  redirect("/admin/assistant");
}
