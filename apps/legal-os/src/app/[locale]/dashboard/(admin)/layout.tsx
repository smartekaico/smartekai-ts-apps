import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { demoRequests } from "@/db/schema";
import { db } from "@/db";
import { eq, count } from "drizzle-orm";
import { UnifiedSidebar } from "@/components/dashboard/UnifiedSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ShieldAlert } from "lucide-react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Security: Only ADMIN role can access anything in this group
  if (session.user.industryRole !== "ADMIN") {
    redirect("/dashboard");
  }

  const role = session.user.industryRole;
  const activeOrgId =
    session.session.activeOrganizationId || session.user.activeOrganizationId;

  // Fetch count of pending demo requests for notification badge
  const [pendingDemoCountResult, activeOrgResult] = await Promise.all([
    db
      .select({ value: count() })
      .from(demoRequests)
      .where(eq(demoRequests.status, "pending")),
    activeOrgId
      ? db.query.organizations.findFirst({
          where: (org, { eq }) => eq(org.id, activeOrgId),
        })
      : Promise.resolve(null),
  ]);

  const pendingDemoCount = Number(pendingDemoCountResult[0].value);
  const activeOrg = activeOrgResult;

  const locale = rawLocale === "en" ? "en" : "ar";
  const messages = await getMessages({ locale });
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SidebarProvider
        className="h-svh w-full overflow-hidden"
        style={
          {
            "--sidebar-width": "256px",
            "--sidebar-width-icon": "3rem",
          } as React.CSSProperties
        }
        dir={dir}
      >
        <UnifiedSidebar
          user={session.user}
          activeOrg={
            activeOrg
              ? {
                  id: activeOrg.id,
                  name: activeOrg.name,
                  creditBalance: activeOrg.creditBalance,
                  defaultJurisdiction: activeOrg.defaultJurisdiction,
                }
              : null
          }
          pendingDemoCount={pendingDemoCount}
          initialRole={role}
        />

        <SidebarInset className="bg-[#F6F6F9] overflow-hidden flex flex-col min-w-0 relative">
          {/* Sidebar Toggle - Floating like User Sidebar */}
          <div className="absolute top-4 start-2 z-50 pointer-events-auto">
            <SidebarTrigger className="bg-white/90 backdrop-blur-md shadow-md border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all" />
          </div>

          <header className="flex items-center gap-2 p-4 border-b bg-white shrink-0 z-30">
            <div className="flex items-center gap-2 ps-12 border-s border-slate-200">
              <ShieldAlert className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-base text-slate-900 truncate">
                {locale === "ar" ? "مركز الإدارة" : "Admin Hub"}
              </span>
            </div>
          </header>

          {/*
						Added 'relative' to main to prevent sub-pages with absolute positioning
						from overlapping the layout header. Added min-w-0 to prevent flex blowout.
					*/}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto relative min-w-0">
            <div className="max-w-full mx-auto min-w-0">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </NextIntlClientProvider>
  );
}
