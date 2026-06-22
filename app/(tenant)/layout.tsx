import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalCheckIn } from "@/components/layout/GlobalCheckIn";
import {
  MobileSidebarProvider,
  MobileMenuButton,
  ResponsiveSidebar,
} from "@/components/layout/MobileSidebarShell";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { getMyNotifications, getUnreadCount } from "@/app/actions/notifications";
import { getMyCheckIn, getProjects } from "@/app/actions/projects";
import { GlobalSearch } from "@/components/layout/GlobalSearch";

// Alle tenant-pages er dynamiske — læser session + DB pr. request.
// Forhindrer Next.js i at prøve at prerender ved build-time (fejler uden DB).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TenantLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) redirect("/login");

  // Super-admin tilhører ikke en tenant — send dem til admin-portalen
  if (session.user.role === "super_admin" && !session.user.tenantId) {
    redirect("/admin");
  }

  const { name, email, role, permissions, modules } = session.user;
  const userLanguage = (session.user as any).language as string | null;

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

  const userTheme = ((session.user as any).theme as "light" | "dark" | "system" | undefined) ?? "system";

  return (
    <ThemeProvider initialTheme={userTheme}>
    <ToastProvider>
    <MobileSidebarProvider>
      <div className="min-h-screen bg-background">
        {/* Sidebar — wrapped i ResponsiveSidebar saa den drawer'er paa mobile */}
        <ResponsiveSidebar>
          <AppSidebar
            modules={modules || []}
            userName={name || "Bruger"}
            userEmail={email || ""}
            userRole={role || "user"}
            permissions={permissions || {}}
            locale={userLanguage as any}
          />
        </ResponsiveSidebar>

        {/* Main content area — fuld bredde paa mobile, marginLeft paa md+ */}
        <div
          className="flex flex-col min-h-screen md:ml-[var(--sidebar-width)]"
        >
          {/* Topbar (fixed) */}
          <header
            className="fixed top-0 right-0 left-0 md:left-[var(--sidebar-width)] bg-card border-b border-border flex items-center justify-between px-3 md:px-6 z-20"
            style={{ height: "var(--topbar-height)" }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Hamburger — kun mobile */}
              <MobileMenuButton />

              {/* Page title placeholder — sider injicerer via AppTopbar */}
              <div id="topbar-title" className="text-base font-semibold text-foreground truncate" />
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Global check-in widget — synlig på alle sider */}
              {(modules?.includes("projects") || activeCheckIn) && (
                <GlobalCheckIn activeCheckIn={activeCheckIn} projects={checkInProjects} />
              )}

              {/* Globalsøg — ⌘K aabner modal */}
              <GlobalSearch />

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
          <main className="flex-1 p-3 sm:p-4 md:p-6 animate-in">{children}</main>
        </div>
        {modal}
      </div>
    </MobileSidebarProvider>
    </ToastProvider>
    </ThemeProvider>
  );
}
