import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { ensureUserOrganization } from "@/lib/migration-utils";
import { demoRequests, organizations, accounts } from "@/db/schema";
import { db } from "@/db";
import { eq, count } from "drizzle-orm";
import { UnifiedSidebar } from "@/components/dashboard/UnifiedSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { redirect } from "next/navigation";
import type React from "react";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    const { locale: rawLocale } = await params;
    const locale = rawLocale === "en" ? "en" : "ar";
    redirect(`/${locale}/login`);
  }

  // Soft migration / Org check
  await ensureUserOrganization(session.user.id);

  const cookieStore = await cookies();
  const viewAs = cookieStore.get("viewAs")?.value;
  const role = session.user.industryRole;
  const effectiveRole = role === "ADMIN" && viewAs === "user" ? "LEGAL" : role;

  const activeOrgId =
    session.session.activeOrganizationId || session.user.activeOrganizationId;

  // Check if user needs to set a password (provisioned by admin)
  const [pendingDemoCountResult, activeOrgResult, accountResult] =
    await Promise.all([
      role === "ADMIN"
        ? db
            .select({ value: count() })
            .from(demoRequests)
            .where(eq(demoRequests.status, "pending"))
        : Promise.resolve([{ value: 0 }]),
      activeOrgId
        ? db
            .select()
            .from(organizations)
            .where(eq(organizations.id, activeOrgId))
            .limit(1)
        : Promise.resolve([]),
      db.query.accounts.findFirst({
        where: (accounts, { and, eq }) =>
          and(
            eq(accounts.userId, session.user.id),
            eq(accounts.password, "ADMIN_PROVISIONED_NEEDS_RESET"),
          ),
      }),
    ]);

  const pendingDemoCount = Number(pendingDemoCountResult[0].value);
  const activeOrg = activeOrgResult[0];
  const needsPasswordReset = !!accountResult;

  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const messages = await getMessages({ locale });
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SidebarProvider
        defaultOpen={true}
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
          initialRole={effectiveRole}
          needsPasswordReset={needsPasswordReset}
        />

        <SidebarInset className="bg-[#F6F6F9] overflow-hidden flex flex-col min-w-0 relative">
          {/*
						The SidebarTrigger is placed at 'start-2'.
						Because SidebarInset is pushed by the Sidebar (flex-1),
						this toggle will always be positioned right next to the sidebar edge.
					*/}
          <div className="absolute top-4 start-2 z-50 pointer-events-auto">
            <SidebarTrigger className="bg-white/90 backdrop-blur-md shadow-md border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all" />
          </div>

          <main className="flex-1 overflow-y-auto relative min-w-0">
            <div className="h-full w-full mx-auto min-w-0">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NextIntlClientProvider>
  );
}
