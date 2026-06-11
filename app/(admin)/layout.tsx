import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";

/**
 * Admin group layout — sidebar + topbanner.
 *
 * Adgang er gated på role === "super_admin" (eller en aktiv impersonation,
 * som vises med tydeligt banner). Selve sider gør deres egne tjek for at
 * sikre at impersonerede sessioner ikke kan kalde admin-actions.
 */
export default async function AdminGroupLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Hvis ikke super_admin og ikke impersonering: smid på login
  if (session?.user?.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar user={{ name: session.user.name ?? "Admin", email: session.user.email ?? "" }} />
      <main className="flex-1 min-w-0 flex flex-col">
        <ImpersonationBanner />
        <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
