"use server";

/**
 * Mentions — server actions til @-syntax picker.
 *
 * searchUsersForMention: fuzzy-search blandt tenant-brugere baseret paa
 * navn eller email. Bruges af MentionInput-komponenten naar bruger
 * skriver @ + tegn.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function searchUsersForMention(query: string): Promise<
  { id: string; name: string; email: string }[]
> {
  const session = await auth();
  if (!session?.user?.tenantId) return [];

  const tenantId = session.user.tenantId;
  const q = query.trim();

  // Returnerer alle aktive brugere hvis query er tom (foerste tasten efter @)
  if (q.length === 0) {
    return db.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 8,
    });
  }

  return db.user.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
    take: 8,
  });
}
