import type { Metadata } from "next";
import { Suspense } from "react";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashHeader } from "@/components/dashboard/dash-header";
import { Splash } from "@/components/splash";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { isConnected, requireViewer } from "@/lib/dashboard-data";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The layout itself is sync so the splash can stream before the auth check
 * resolves — landing here straight from Google, the first paint is the mark
 * mid-spin, not a blank page waiting on requireViewer.
 */
export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<Splash />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}

async function DashboardShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await requireViewer();

  return (
    <SidebarProvider>
      <AppSidebar
        name={viewer.name}
        email={viewer.email}
        image={viewer.image}
        linked={isConnected(viewer)}
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
