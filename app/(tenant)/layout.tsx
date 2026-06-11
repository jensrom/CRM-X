import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalCheckIn } from "@/components/layout/GlobalCheckIn";
import { getMyNotifications, getUnreadCount } from "@/app/actions/notifications";
import { getMyCheckIn, getProjects } from "@/app/actions/projects";
import { Search } from "lucide-react";

export default async function TenantLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  // Super-admin tilhører ikke en tenant — send dem til admin-portalen
  if (session.user.role === "super_admin" && !session.user.tenantId) {
    redirect("/admin");
  }

  const { name, email, role, permissions, modules } = session.user;

  const [notifications, unreadCount, myCheckIn, projects] = await Promise.all([
    getMyNotifications(20),
    getUnreadCount(),
    getMyCheckIn(),
    getProjects({ status: "active" }),
  ]);

  const activeCheckIn = myCheckIn
    ? {
        projectId: myCheckIn.projectId,
        projectTitle:
          projects.find((p) => p.id === myCheckIn.projectId)?.title ?? "Projekt",
        startedAt: myCheckIn.startedAt.toISOString(),
      }
    : null;

  const checkInProjects = projects.map((p) => ({
    id: p.id,
    title: p.title,
    number: p.number,
    company: { name: p.company?.name ?? "—" },
    tenant: { projectPrefix: p.tenant.projectPrefix },
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <AppSidebar
        modules={modules || []}
        userName={name || "Bruger"}
        userEmail={email || ""}
        userRole={role || "user"}
        permissions={permissions || {}}
      />

      {/* Main content area */}
      <div
        className="flex flex-col min-h-screen"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        {/* Topbar (fixed) */}
        <header
          className="fixed top-0 right-0 bg-card border-b border-border flex items-center justify-between px-6 z-20"
          style={{ left: "var(--sidebar-width)", height: "var(--topbar-height)" }}
        >
          {/* Page title placeholder — sider injicerer via AppTopbar */}
          <div id="topbar-title" className="text-base font-semibold text-foreground" />

          <div className="flex items-center gap-2">
            {/* Global check-in widget — synlig på alle sider */}
            {(modules?.includes("projects") || activeCheckIn) && (
              <GlobalCheckIn activeCheckIn={activeCheckIn} projects={checkInProjects} />
            )}

            {/* Søg */}
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground text-sm hover:bg-secondary transition-colors">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Søg...</span>
              <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border font-mono">
                K
              </kbd>
            </button>

            {/* Notifikationsklokke med live data */}
            <NotificationBell
              initialNotifications={notifications as any}
              initialUnread={unreadCount}
            />
          </div>
        </header>

        {/* Topbar height reservation */}
        <div style={{ height: "var(--topbar-height)" }} className="shrink-0" />

        {/* Main */}
        <main className="flex-1 p-6 animate-in">{children}</main>
      </div>
      {modal}
    </div>
  );
}
