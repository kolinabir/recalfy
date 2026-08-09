import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashHeader } from "@/components/dashboard/dash-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireViewer } from "@/lib/dashboard-data";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await requireViewer();

  return (
    <SidebarProvider>
      <AppSidebar
        name={viewer.name}
        email={viewer.email}
        image={viewer.image}
        linked={typeof viewer.telegramUserId === "number"}
      />
      <SidebarInset className="bg-bg">
        <DashHeader />
        <div className="mx-auto w-full max-w-4xl flex-1 px-5 py-10 sm:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
