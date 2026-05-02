"use client";

import type * as React from "react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, Link, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { DocumentLink } from "@/components/legal/DocumentLink";
import { AddEventModal } from "@/components/legal/AddEventModal";
import { UserNav } from "@/components/global/UserNav";
import { cn } from "@/lib/utils";
import {
	Database,
	FileText,
	LayoutDashboard,
	ShieldCheck,
	Bot,
	Scale,
	Users,
	Key,
	Stethoscope,
	Mic,
	Loader2,
	Search,
	History,
	ClipboardList,
	Gavel,
	Calendar,
	Plus,
	FolderPlus,
	ChevronDown,
	CreditCard,
	Globe,
	MessageSquare,
	Sparkles,
	Lock,
} from "lucide-react";
import { toast } from "sonner";
import { InstantSessionButton } from "@/components/legal/InstantSessionButton";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarGroupContent,
	SidebarGroupAction,
	useSidebar,
	SidebarTrigger,
	SidebarRail,
} from "@/components/ui/sidebar";
import { Collapsible } from "@base-ui/react/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";
import { CommandSearch } from "@/components/dashboard/CommandSearch";
import { OnboardingTour } from "@/components/dashboard/OnboardingTour";

interface UnifiedSidebarProps {
	user: {
		name: string;
		email: string;
		image?: string | null;
		industryRole?: string;
	};
	activeOrg: {
		id: string;
		name: string;
		creditBalance?: number;
		defaultJurisdiction?: string;
	} | null;
	pendingDemoCount: number;
	initialRole: string;
	needsPasswordReset?: boolean;
}

export function UnifiedSidebar({
	user,
	activeOrg,
	pendingDemoCount,
	initialRole,
	needsPasswordReset = false,
}: UnifiedSidebarProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const currentLocale = useLocale();
	const t = useTranslations("Dashboard");
	const pathname = usePathname();
	const { state, isMobile, setOpenMobile } = useSidebar();
	const isCollapsed = state === "collapsed";

	const [sessionDocs, setSessionDocs] = useState<any[]>([]);
	const [loadingDocs, setLoadingDocs] = useState(false);
	const [favoriteSessions, setFavoriteSessions] = useState<any[]>([]);
	const [activityLog, setActivityLog] = useState<any[]>([]);
	const [isCommandOpen, setIsCommandOpen] = useState(false);
	const [sessionEvents, setSessionEvents] = useState<any[]>([]);
	const [selectedEvent, setSelectedEvent] = useState<any>(null);
	const [isEventModalOpen, setIsEventModalOpen] = useState(false);
	const [showOnboarding, setShowOnboarding] = useState(false);

	// Workspace detection
	const match = pathname.match(/\/sessions\/([^/?]+)/);
	const sessionId = match ? match[1] : null;

	const fetchWorkspaceData = async () => {
		if (!sessionId) return;
		setLoadingDocs(true);
		try {
			const [docsRes, eventsRes] = await Promise.all([
				fetch(`/api/legal/documents?projectId=${sessionId}`),
				fetch(`/api/legal/events?projectId=${sessionId}`),
			]);
			if (docsRes.ok) setSessionDocs(await docsRes.json());
			if (eventsRes.ok) setSessionEvents(await eventsRes.json());
		} catch (err) {
			console.error("Failed to fetch session workspace data", err);
		} finally {
			setLoadingDocs(false);
		}
	};

	const fetchAllSessions = async () => {
		try {
			const [sessionsRes, activityRes] = await Promise.all([
				fetch("/api/legal/sessions"),
				fetch("/api/legal/activity"),
			]);
			if (sessionsRes.ok) {
				const data: any[] = await sessionsRes.json();
				const activeSessions = data.filter((s) => s.status !== "Archived");
				setFavoriteSessions(activeSessions.filter((s) => s.isFavorite));
			}
			if (activityRes.ok) setActivityLog(await activityRes.json());
		} catch (err) {
			console.error("Failed to fetch sidebar data", err);
		}
	};

	useEffect(() => {
		fetchAllSessions();
		const handleGlobalRefresh = () => {
			fetchWorkspaceData();
			fetchAllSessions();
		};
		window.addEventListener("refresh-workspace", handleGlobalRefresh);
		return () => window.removeEventListener("refresh-workspace", handleGlobalRefresh);
	}, []);

	useEffect(() => {
		if (sessionId) fetchWorkspaceData();
	}, [sessionId]);

	useEffect(() => {
		if (pathname === "/dashboard" && !localStorage.getItem("onboarding_seen")) {
			setTimeout(() => {
				setShowOnboarding(true);
				localStorage.setItem("onboarding_seen", "true");
			}, 1500);
		} else if (pathname.includes("/sessions/") && !localStorage.getItem("onboarding_session_seen")) {
			setTimeout(() => {
				setShowOnboarding(true);
				localStorage.setItem("onboarding_session_seen", "true");
			}, 1500);
		}
	}, [pathname]);

	useEffect(() => {
		if (isMobile) {
			setOpenMobile(false);
		}
	}, [pathname, isMobile, setOpenMobile]);

	const effectiveRole = initialRole;

	const isActive = (href: string) => pathname === href;

	// Navigation items
	const legalNavItems = [
		{ href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard, disabled: false },
		{ href: "/dashboard/history", label: t("history") || "السجل", icon: History, disabled: false },
		{ href: "/dashboard/reports", label: t("reports") || "التقارير", icon: ClipboardList, disabled: false },
		{ href: "/dashboard/knowledge-base", label: t("knowledgeBase") || "قاعدة المعرفة", icon: Database, disabled: false },
	];

	const adminNavItems = [
		{ href: "/dashboard/admin", label: t("adminHub"), icon: ShieldCheck },
		{ href: "/dashboard/admin/access", label: t("accessManagement") || "إدارة الوصول", icon: Key },
		{ href: "/dashboard/admin/models", label: t("manageModels"), icon: Bot },
	];

	const productSuiteItems = [
		{
			label: t("appTitleLegal"),
			icon: Scale,
			children: [
				{ href: "/dashboard/admin/legal/subscribers", label: t("subscribers"), icon: CreditCard },
				{ href: "/dashboard/admin/legal/jurisdictions", label: t("jurisdictions"), icon: Globe },
				{ href: "/dashboard/admin/legal/kb", label: t("knowledgeBase") || "قاعدة المعرفة", icon: Database },
			],
		},
		{
			label: t("appTitleMedical"),
			icon: Stethoscope,
			children: [],
		},
	];

	const medicalNavItems = [
		{ href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
		{ href: "/dashboard/scribe", label: t("scribe"), icon: Mic, disabled: true },
		{ href: "/dashboard/patients", label: t("patients"), icon: Users, disabled: true },
	];

	return (
		<>
			<Sidebar
				side={currentLocale === "ar" ? "right" : "left"}
				dir={currentLocale === "ar" ? "rtl" : "ltr"}
				collapsible="icon"
				className="border-e bg-white"
			>
				<SidebarHeader className="p-4 pb-2">
					{needsPasswordReset && !isCollapsed && (
						<div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500">
							<div className="flex items-start gap-2">
								<Lock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
								<div>
									<p className="text-[11px] font-bold text-amber-900 leading-tight">
										{currentLocale === "ar" ? "أمن حسابك" : "Secure Your Account"}
									</p>
									<p className="text-[10px] text-amber-700 mt-1 leading-tight">
										{currentLocale === "ar" 
											? "يرجى تعيين كلمة مرور دائمة للوصول مستقبلاً." 
											: "Please set a permanent password for future access."}
									</p>
									<Link 
										href="/dashboard/settings" 
										className="inline-block mt-2 text-[10px] font-black text-amber-900 underline hover:text-amber-950"
									>
										{currentLocale === "ar" ? "تعيين الآن" : "Set Now"}
									</Link>
								</div>
							</div>
						</div>
					)}
					{needsPasswordReset && isCollapsed && (
						<Link href="/dashboard/settings" className="mb-4 mx-auto block">
							<div className="h-8 w-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 border border-amber-200">
								<Lock className="h-4 w-4" />
							</div>
						</Link>
					)}
					<div className="flex items-center justify-between gap-2 mb-2 min-w-0">
						<Link href="/dashboard" className="flex items-center gap-3 px-2 group">
							<div className="relative h-10 w-10 shrink-0 transition-transform group-hover:scale-110">
								<Image
									src="/logo-icon.svg"
									alt="SmarTekAI"
									fill
									sizes="40px"
									className="object-contain"
								/>
							</div>
							{!isCollapsed && (
								<span className="font-black text-xl text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
									SmarTekAI
								</span>
							)}
						</Link>
					</div>

					<div className="mt-2 space-y-2">
						{effectiveRole === "LEGAL" && (
							<div id="sidebar-instant-session">
								<InstantSessionButton
									className={cn(
										"w-full bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm hover:shadow-md",
										isCollapsed ? "h-9 w-9 p-0 rounded-lg mx-auto" : "rounded-xl py-2.5 font-bold text-sm"
									)}
									showIconOnly={isCollapsed}
								/>
							</div>
						)}

						{effectiveRole === "LEGAL" && (
							<button
								id="sidebar-search"
								onClick={() => setIsCommandOpen(true)}
								className={cn(
									"flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg transition-all h-9 w-full text-start hover:bg-slate-100",
									isCollapsed ? "justify-center p-0" : "px-3"
								)}
							>
								<Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
								{!isCollapsed && (
									<span className="text-xs text-slate-400 font-medium flex-1 truncate">
										{t("searchPlaceholder") || "بحث سريع..."}
									</span>
								)}
							</button>
						)}
					</div>
				</SidebarHeader>

				<SidebarContent>
					<ScrollArea className="flex-1 px-2">
						{/* Favorite Sessions - Hidden in Session View per User Request */}
						{effectiveRole === "LEGAL" && favoriteSessions.length > 0 && !sessionId && (
							<SidebarGroup>
								<SidebarGroupLabel className={cn(isCollapsed && "hidden")}>
									{t("favoriteSessions")}
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{favoriteSessions.map((session) => (
											<SidebarMenuItem key={session.id}>
												<SidebarMenuButton
													asChild
													tooltip={session.title}
													className={cn(
														"text-slate-700 hover:bg-slate-50",
														sessionId === session.id && "bg-slate-50 font-bold text-indigo-600"
													)}
												>
													<Link href={`/dashboard/sessions/${session.id}`}>
														<div className="h-4 w-4 rounded flex items-center justify-center shrink-0 text-amber-500">
															<Scale className={cn("h-3.5 w-3.5", sessionId === session.id ? "fill-current" : "fill-none")} />
														</div>
														<span className="truncate">{session.title}</span>
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						)}

						{/* Top Session Content (Chats, Saved Docs, Events) */}
						{sessionId && (
							<>
								{/* Saved Chats / Research Docs Section */}
								<SidebarGroup>
									<SidebarGroupLabel className={cn(isCollapsed && "hidden")}>
										{t("savedChats") || (currentLocale === "ar" ? "المحادثات المحفوظة" : "Saved Chats")}
									</SidebarGroupLabel>
									<SidebarGroupContent>
										<SidebarMenu>
											{sessionDocs.filter(d => d.docType === "Research").length > 0 ? (
												sessionDocs
													.filter(d => d.docType === "Research")
													.map((chat) => (
														<SidebarMenuItem key={chat.id}>
															<SidebarMenuButton
																asChild
																tooltip={chat.title}
																className="text-slate-700 hover:bg-slate-50"
															>
																<Link href={`/dashboard/sessions/${sessionId}?docId=${chat.id}`}>
																	<Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
																	<span className="truncate">{chat.title.replace("Lex Insight: ", "")}</span>
																</Link>
															</SidebarMenuButton>
														</SidebarMenuItem>
													))
											) : (
												<div className={cn("px-4 py-2 text-[10px] text-slate-400 italic", isCollapsed && "hidden")}>
													{currentLocale === "ar" ? "لا توجد محادثات محفوظة" : "No saved chats"}
												</div>
											)}
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>

								{/* Session Documents (Drafts etc) */}
								<SidebarGroup>
									<SidebarGroupLabel className={cn(isCollapsed && "hidden")}>
										{currentLocale === "ar" ? "مستندات الجلسة" : "Session Documents"}
									</SidebarGroupLabel>
									<SidebarGroupContent>
										<div className="px-2 space-y-1">
											{loadingDocs ? (
												<div className="flex items-center gap-2 p-2 text-xs text-slate-400 animate-pulse">
													<Loader2 className="h-3 w-3 animate-spin" />
													<span>{t("loading")}</span>
												</div>
											) : sessionDocs.filter(d => d.docType !== "Research").length > 0 ? (
												sessionDocs
													.filter(d => d.docType !== "Research")
													.map((doc) => (
														<DocumentLink
															key={doc.id}
															id={doc.id}
															title={doc.title}
															sessionId={sessionId}
															isCollapsed={isCollapsed}
														/>
													))
											) : (
												<p className={cn("text-[10px] text-slate-400 italic px-2", isCollapsed && "hidden")}>
													{t("noDocs")}
												</p>
											)}
										</div>
									</SidebarGroupContent>
								</SidebarGroup>

								{/* Session Events */}
								<SidebarGroup>
									<SidebarGroupLabel className={cn(isCollapsed && "hidden")}>
										{currentLocale === "ar" ? "المواعيد" : t("sidebarEvents")}
									</SidebarGroupLabel>
									<SidebarGroupContent>
										<div className="px-2 space-y-1">
											{sessionEvents.length > 0 ? (
												sessionEvents.map((event) => (
													<div
														key={event.id}
														onClick={() => {
															setSelectedEvent(event);
															setIsEventModalOpen(true);
														}}
														className={cn(
															"flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 rounded-md hover:bg-slate-50 transition-colors cursor-pointer",
															isCollapsed && "justify-center px-0"
														)}
													>
														<Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
														{!isCollapsed && (
															<div className="flex-1 truncate">
																<p className="font-medium truncate">{event.title}</p>
																<p className="text-[10px] text-slate-400">
																	{new Date(event.date).toLocaleDateString(currentLocale)}
																</p>
															</div>
														)}
													</div>
												))
											) : (
												<p className={cn("text-[10px] text-slate-400 italic px-2", isCollapsed && "hidden")}>
													{t("sidebarNoEvents")}
												</p>
											)}
										</div>
									</SidebarGroupContent>
								</SidebarGroup>
							</>
						)}

						{/* Admin-specific main navigation */}
						{effectiveRole === "ADMIN" && (
							<SidebarGroup>
								<SidebarGroupLabel className={cn(isCollapsed && "hidden")}>
									{t("adminHub")}
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{adminNavItems.map((item) => (
											<SidebarMenuItem key={item.label}>
												<SidebarMenuButton
													asChild
													isActive={isActive(item.href)}
													tooltip={item.label}
													className={cn(
														"text-slate-700 hover:bg-slate-50",
														isActive(item.href) && "bg-slate-50 font-bold text-slate-900"
													)}
												>
													<Link href={item.href}>
														<item.icon className={cn("h-4 w-4 shrink-0", isActive(item.href) ? "text-indigo-600" : "text-slate-400")} />
														<span>{item.label}</span>
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						)}

						{/* Medical-specific main navigation */}
						{effectiveRole === "MEDICAL" && (
							<SidebarGroup>
								<SidebarGroupLabel className={cn(isCollapsed && "hidden")}>
									{t("appTitleMedical")}
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{medicalNavItems.map((item: any) => (
											<SidebarMenuItem key={item.label}>
												<SidebarMenuButton
													asChild
													isActive={isActive(item.href)}
													tooltip={item.label}
													className={cn(
														"text-slate-700 hover:bg-slate-50",
														isActive(item.href) && "bg-slate-50 font-bold text-slate-900",
														item.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
													)}
												>
													<Link href={item.href} onClick={(e) => item.disabled && e.preventDefault()}>
														<item.icon className={cn("h-4 w-4 shrink-0", isActive(item.href) ? "text-indigo-600" : "text-slate-400")} />
														<span>{item.label}</span>
														{item.disabled && <Lock className="ms-auto h-3 w-3 text-slate-300" />}
													</Link>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						)}

						{/* Product Suite for Admin — Collapsible Sub-menus */}
						{effectiveRole === "ADMIN" && (
							<SidebarGroup>
								<SidebarGroupLabel className={cn(isCollapsed && "hidden")}>
									{t("productSuite")}
								</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{productSuiteItems.map((product) => (
											<Collapsible.Root key={product.label} defaultOpen={false}>
												<SidebarMenuItem>
													<Collapsible.Trigger
														render={
															<SidebarMenuButton
																tooltip={product.label}
																className="text-slate-600 hover:bg-slate-50"
															/>
														}
													>
														<product.icon className="h-4 w-4 text-slate-400 shrink-0" />
														<span className="flex-1 truncate text-start">{product.label}</span>
														<ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 [[data-panel-open]_&]:rotate-180" />
													</Collapsible.Trigger>
													<Collapsible.Panel>
														<SidebarMenuSub>
															{product.children.map((sub) => (
																<SidebarMenuSubItem key={sub.label}>
																	<SidebarMenuSubButton
																		asChild
																		isActive={isActive(sub.href)}
																		className={cn((sub as any).disabled && "opacity-50 cursor-not-allowed pointer-events-none")}
																	>
																		<Link href={sub.href as any} onClick={(e) => {
																			if ((sub as any).disabled) {
																				e.preventDefault();
																			} else if ((sub as any).onClick) {
																				(sub as any).onClick();
																			}
																		}}>
																			<sub.icon className="h-3.5 w-3.5 shrink-0" />
																			<span className="flex-1 truncate text-start">{sub.label}</span>
																			{(sub as any).disabled && <Lock className="ms-auto h-3 w-3 text-slate-300" />}
																		</Link>
																	</SidebarMenuSubButton>
																</SidebarMenuSubItem>
															))}
														</SidebarMenuSub>
													</Collapsible.Panel>
												</SidebarMenuItem>
											</Collapsible.Root>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						)}
					</ScrollArea>
				</SidebarContent>

				<SidebarFooter className="p-4 border-t border-slate-100 space-y-4">
					{/* Office Management Group - Fixed at Bottom for Legal */}
					{effectiveRole === "LEGAL" && (
						<div className="pb-4">
							<p className={cn("text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2", isCollapsed && "hidden")}>
								{t("officeManagement") || "إدارة المكتب"}
							</p>
							<SidebarMenu>
								{legalNavItems.map((item) => (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton
											asChild
											isActive={isActive(item.href)}
											tooltip={item.label}
											id={`sidebar-nav-${item.href.split("/").pop() || "dashboard"}`}
											className={cn(
												"transition-all duration-200",
												isActive(item.href)
													? "bg-slate-100 text-slate-900 font-bold border border-slate-200 shadow-sm"
													: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
												item.disabled && "opacity-50 cursor-not-allowed pointer-events-none hover:bg-transparent"
											)}
										>
											<Link href={item.href} onClick={(e) => item.disabled && e.preventDefault()}>
												<item.icon className={cn(
													"h-4 w-4 shrink-0",
													isActive(item.href) ? "text-indigo-600" : "text-slate-400"
												)} />
												<span>{item.label}</span>
												{item.disabled && <Lock className="ms-auto h-3 w-3 text-slate-300" />}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</div>
					)}

					<div className="pb-2">
						<SidebarMenu>
							<SidebarMenuItem>
								<SidebarMenuButton
									onClick={() => setShowOnboarding(true)}
									tooltip={currentLocale === "ar" ? "دليل البدء السريع" : "Quick Start Guide"}
									className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold"
								>
									<Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
									<span>{currentLocale === "ar" ? "دليل البدء السريع" : "Quick Start Guide"}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						</SidebarMenu>
					</div>

					<div id="sidebar-user-nav">
						<UserNav
							user={user}
							organization={activeOrg}
							pendingDemoCount={pendingDemoCount}
							isCollapsed={isCollapsed}
						/>
					</div>
				</SidebarFooter>
				<SidebarRail />

				{/* Event Modal */}
				{isEventModalOpen && (
					<AddEventModal
						open={isEventModalOpen}
						onOpenChange={setIsEventModalOpen}
						eventData={selectedEvent}
						projectId={sessionId || undefined}
						onSuccess={() => {
							fetchWorkspaceData();
							window.dispatchEvent(new CustomEvent("refresh-workspace"));
						}}
					/>
				)}
			</Sidebar>

			<CommandSearch
				isOpen={isCommandOpen}
				onClose={() => setIsCommandOpen(false)}
			/>

			{showOnboarding && (
				<OnboardingTour 
					role={effectiveRole} 
					type={pathname.includes("/sessions/") ? "SESSION" : "DASHBOARD"}
					onClose={() => setShowOnboarding(false)} 
				/>
			)}
		</>
	);
}
