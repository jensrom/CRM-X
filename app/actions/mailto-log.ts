"use server";

/**
 * Logger en "mailto:"-aabning til EmailLog.
 *
 * Vi kan ikke vide om brugeren faktisk klikkede "Send" i Outlook — kun at
 * de aabnede mail-klienten med pre-udfyldt indhold. Status="opened" markerer
 * dette tydeligt i historikken.
 */

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function logMailtoOpened({
  to, subject, body, resourceType, resourceId,
}: {
  to: string;
  subject: string;
  body: string;
  resourceType: string;
  resourceId: string;
}) {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.id) return;

  try {
    await db.emailLog.create({
      data: {
        tenantId: session.user.tenantId,
        userId:   session.user.id,
        provider: "mailto",
        status:   "opened",
        fromAddress: (session.user as any).email ?? "",
        toAddresses: to.split(",").map((s) => s.trim()).filter(Boolean),
        subject,
        bodyText: body,
        resourceType,
        resourceId,
      },
    });
  } catch {
    // Logging er best-effort
  }
}
