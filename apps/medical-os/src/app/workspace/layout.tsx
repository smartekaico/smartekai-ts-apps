"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { MedicalSidebar } from "@/components/dashboard/MedicalSidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen={true}
      className="h-svh w-full overflow-hidden"
      style={{ "--sidebar-width": "256px", "--sidebar-width-icon": "3rem" } as React.CSSProperties}
    >
      <MedicalSidebar />
      <SidebarInset className="bg-[#F6F6F9] overflow-hidden flex flex-col min-w-0 relative">
        <main className="flex-1 overflow-y-auto relative min-w-0">
          <div className="h-full w-full mx-auto min-w-0">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
