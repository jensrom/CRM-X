/**
 * Creator-context
 * ───────────────
 * Server-side helper der returnerer hvem der "lige nu" opretter en ressource.
 *
 * Returnerer to felter til at sætte direkte på en ny række:
 *   createdById              — den faktiske tenant-bruger (eller null hvis ukendt)
 *   createdByImpersonatorId  — super-admin'ens ID hvis impersonation er aktiv
 *
 * Impersonation læses fra cookie `cx_impersonate` (samme som ImpersonationBanner).
 * Hvis cookien er sat, betyder det at en super-admin er "udført som" en tenant-
 * bruger — så vi gemmer begge IDs så vi senere kan vise "Oprettet af Erik
 * (impersoneret af Jens)".
 *
 * Hvis ingen impersonation: createdByImpersonatorId er null og createdById er
 * den almindelige session-bruger.
 */

import { cookies } from "next/headers";
import { auth } from "./auth";

export interface CreatorContext {
  createdById: string | null;
  createdByImpersonatorId: string | null;
}

export async function getCreatorContext(): Promise<CreatorContext> {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let impersonatorId: string | null = null;
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("cx_impersonate")?.value;
    if (raw) {
      const [data] = raw.split(".");
      const parsed = JSON.parse(data) as { superAdminId?: string };
      if (parsed.superAdminId) {
        impersonatorId = parsed.superAdminId;
      }
    }
  } catch {
    // Hvis cookien ikke kan parses, ignorerer vi den
  }

  return {
    createdById: userId,
    createdByImpersonatorId: impersonatorId,
  };
}

/**
 * Henter visnings-info om en ressource-skaber til at vise i UI.
 *
 * Returnerer label-strings klar til badge:
 *   { primaryName, impersonatorName }
 *
 * Hvor primaryName er den faktiske bruger og impersonatorName er super-admin'en
 * (kun sat hvis ressourcen blev oprettet under impersonation).
 *
 * Henter brugerne lazily — kun de IDs der faktisk er sat.
 */
export async function resolveCreatorLabels(
  createdById: string | null | undefined,
  createdByImpersonatorId: string | null | undefined,
): Promise<{ primaryName: string | null; impersonatorName: string | null }> {
  const { db } = await import("./db");

  const [user, admin] = await Promise.all([
    createdById
      ? db.user.findUnique({
          where: { id: createdById },
          select: { name: true, email: true },
        })
      : null,
    createdByImpersonatorId
      ? db.superAdmin.findUnique({
          where: { id: createdByImpersonatorId },
          select: { name: true, email: true },
        })
      : null,
  ]);

  return {
    primaryName: user ? (user.name ?? user.email) : null,
    impersonatorName: admin ? (admin.name ?? admin.email) : null,
  };
}
