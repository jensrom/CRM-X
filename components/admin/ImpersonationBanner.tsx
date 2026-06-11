import { cookies } from "next/headers";
import { AlertCircle } from "lucide-react";

/**
 * Vises kun når super_admin er ved at impersonere en tenant-admin.
 * Læses fra HTTP-only cookie `cx_impersonate` som er sat af
 * /api/admin/impersonate-route'n.
 */
export async function ImpersonationBanner() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("cx_impersonate")?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      tenantSlug: string;
      tenantName: string;
      userId: string;
      expiresAt: string;
    };
    const minutesLeft = Math.max(
      0,
      Math.round((new Date(parsed.expiresAt).getTime() - Date.now()) / 60000),
    );

    return (
      <div className="bg-amber-500 text-amber-950 px-6 py-2.5 flex items-center gap-3 border-b border-amber-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium flex-1">
          <span className="font-semibold">Impersonerer:</span> {parsed.tenantName}{" "}
          <span className="opacity-70">({parsed.tenantSlug}.plesnertech.dk)</span> —{" "}
          read-only, udløber om {minutesLeft} min
        </p>
        <form action="/api/admin/impersonate" method="POST" className="shrink-0">
          <input type="hidden" name="action" value="stop" />
          <button
            type="submit"
            className="text-xs font-semibold underline hover:no-underline"
          >
            Afslut session
          </button>
        </form>
      </div>
    );
  } catch {
    return null;
  }
}
