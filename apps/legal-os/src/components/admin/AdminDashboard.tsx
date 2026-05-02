"use client";

import * as React from "react";
import { useState } from "react";
import {
	Users,
	CheckCircle2,
	XCircle,
	ArrowRight,
	ShieldCheck,
	Zap,
	Briefcase,
	Database,
	Activity,
	Sparkles,
	MessageSquare,
	Bell,
	ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
	approveDemoRequest,
	deleteDemoRequest,
} from "@/app/[locale]/actions/admin";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Link } from "@/i18n/routing";

interface DemoRequest {
	id: string;
	name: string;
	email: string;
	industry: string;
	company: string | null;
	status: string;
	createdAt: string;
}

export interface AdminDashboardProps {
	initialDemoRequests?: DemoRequest[];
	kbStats?: { jurisdictions: number; categories: number; documents: number };
	creditStats?: { action: string; totalCredits: number }[];
}

const ACTION_LABELS: Record<
	string,
	{ label: string; color: string; icon: any }
> = {
	LEGAL_DRAFTING: {
		label: "Legal Drafting",
		color: "bg-indigo-50 text-indigo-600",
		icon: Database,
	},
	LEGAL_ANALYSIS: {
		label: "Legal Analysis",
		color: "bg-amber-50 text-amber-600",
		icon: Sparkles,
	},
	LEGAL_RESEARCH: {
		label: "Legal Research",
		color: "bg-sky-50 text-sky-600",
		icon: Activity,
	},
	CHATS_MESSAGE: {
		label: "Smart Chats",
		color: "bg-emerald-50 text-emerald-600",
		icon: MessageSquare,
	},
	CONTRACT_GENERATION: {
		label: "Contract Generation",
		color: "bg-purple-50 text-purple-600",
		icon: Briefcase,
	},
};

export function AdminDashboard({
	initialDemoRequests = [],
	kbStats = { jurisdictions: 0, categories: 0, documents: 0 },
	creditStats = [],
}: AdminDashboardProps) {
	const [demoRequests, setDemoRequests] =
		useState<DemoRequest[]>(initialDemoRequests);
	const [approvingIds, setApprovingIds] = useState<string[]>([]);
	const [deletingIds, setDeletingIds] = useState<string[]>([]);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [requestIdToDelete, setRequestIdToDelete] = useState<string | null>(
		null,
	);

	const pendingRequests = demoRequests.filter((r) => r.status === "pending");

	const handleDeleteRequest = (requestId: string) => {
		setRequestIdToDelete(requestId);
		setDeleteModalOpen(true);
	};

	const confirmDelete = async () => {
		if (!requestIdToDelete) return;
		const requestId = requestIdToDelete;
		setDeleteModalOpen(false);
		setRequestIdToDelete(null);

		setDeletingIds((prev) => [...prev, requestId]);
		const result = await deleteDemoRequest(requestId);
		setDeletingIds((prev) => prev.filter((id) => id !== requestId));

		if (result.success) {
			setDemoRequests((prev) => prev.filter((r) => r.id !== requestId));
			toast.success("Request rejected successfully");
		} else {
			toast.error(result.error || "Failed to reject request");
		}
	};

	const handleApproveRequest = async (request: DemoRequest) => {
		setApprovingIds((prev) => [...prev, request.id]);
		const credits =
			request.industry === "LEGAL"
				? 50
				: request.industry === "MEDICAL"
					? 25
					: 50;
		const result = await approveDemoRequest(
			request.id,
			request.industry,
			credits,
		);

		setApprovingIds((prev) => prev.filter((id) => id !== request.id));

		if (result.success) {
			setDemoRequests((prev) => prev.filter((r) => r.id !== request.id));
			toast.success("Request approved and user account created!");
		} else {
			toast.error(result.error || "Approval failed");
		}
	};

	const totalCreditsConsumed = creditStats.reduce(
		(sum, stat) => sum + stat.totalCredits,
		0,
	);

	return (
		<div
			className="space-y-8 animate-in fade-in duration-700 ltr px-4 md:px-0 mb-12"
			dir="ltr"
		>
			{/* Header */}
			<nav className="flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
				<div className="space-y-1">
					<h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 text-wrap-balance">
						<ShieldCheck
							className="h-6 w-6 md:h-8 md:w-8 text-indigo-600"
							aria-hidden="true"
						/>
						Admin Hub Center
					</h1>
					<p className="text-slate-500 font-medium">
						Platform overview, credit consumption, and urgent alerts.
					</p>
				</div>
				<div className="flex gap-3">
					<Button
						asChild
						className="rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold px-6 py-6 shadow-sm shadow-slate-100 transition-transform active:scale-95"
					>
						<Link href="/dashboard/admin/access">
							Access Management{" "}
							<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
						</Link>
					</Button>
				</div>
			</nav>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Left Column: Notifications & Quick Actions */}
				<div className="lg:col-span-2 space-y-8">
					{/* Notifications Panel */}
					<section>
						<Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
							<CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 bg-slate-50/50">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-2xl bg-rose-50 flex items-center justify-center shadow-inner">
										<Bell
											className="h-5 w-5 text-rose-500 fill-rose-500"
											aria-hidden="true"
										/>
									</div>
									<div className="text-left">
										<CardTitle className="text-lg font-black text-slate-900">
											Joining Alerts
										</CardTitle>
										<CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
											Demo requests awaiting approval
										</CardDescription>
									</div>
								</div>
								{pendingRequests.length > 0 && (
									<span className="bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse font-variant-numeric:tabular-nums shadow-lg shadow-rose-200">
										{pendingRequests.length} new requests
									</span>
								)}
							</CardHeader>
							<CardContent className="p-0">
								{pendingRequests.length === 0 ? (
									<div className="p-12 text-center text-slate-400 font-medium flex flex-col items-center gap-4">
										<CheckCircle2
											className="h-12 w-12 text-slate-100"
											aria-hidden="true"
										/>
										<p>No pending requests at the moment. Great job!</p>
									</div>
								) : (
									<div className="divide-y divide-slate-50">
										{pendingRequests.slice(0, 5).map((request) => (
											<div
												key={request.id}
												className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/30 transition-colors text-left group"
											>
												<div className="flex items-center gap-4">
													<div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-600 text-lg shrink-0 border border-white shadow-sm ring-4 ring-slate-50/50 group-hover:ring-indigo-50/50 transition-all">
														{request.name[0]}
													</div>
													<div className="min-w-0">
														<div className="flex items-center gap-2">
															<p className="font-black text-slate-900 truncate">
																{request.name}
															</p>
															<span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase border border-indigo-100 shadow-sm">
																{request.industry}
															</span>
														</div>
														<p className="text-xs text-slate-400 font-medium truncate mt-0.5">
															{request.email}
														</p>
													</div>
												</div>
												<div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
													<Button
														size="sm"
														className="rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 h-10 px-4 font-bold gap-2 shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
														onClick={() => handleApproveRequest(request)}
														disabled={
															approvingIds.includes(request.id) ||
															deletingIds.includes(request.id)
														}
													>
														<CheckCircle2
															className={cn(
																"h-4 w-4",
																approvingIds.includes(request.id) &&
																	"animate-spin",
															)}
															aria-hidden="true"
														/>
														Approve
													</Button>
													<Button
														size="sm"
														variant="ghost"
														className="rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 h-10 w-10 flex items-center justify-center p-0 transition-transform active:scale-95"
														onClick={() => handleDeleteRequest(request.id)}
														disabled={
															deletingIds.includes(request.id) ||
															approvingIds.includes(request.id)
														}
														aria-label={`Reject request from ${request.name}`}
													>
														<XCircle
															className={cn(
																"h-5 w-5",
																deletingIds.includes(request.id) &&
																	"animate-pulse",
															)}
															aria-hidden="true"
														/>
													</Button>
												</div>
											</div>
										))}
										{pendingRequests.length > 5 && (
											<div className="p-4 bg-slate-50/50 text-center">
												<Button
													asChild
													variant="link"
													className="text-indigo-600 font-black text-xs"
												>
													<Link href="/dashboard/admin/access">
														View All Requests ({pendingRequests.length}){" "}
														<ArrowRight
															className="ml-2 h-3 w-3"
															aria-hidden="true"
														/>
													</Link>
												</Button>
											</div>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					</section>

					{/* Credit Consumption Tracker */}
					<section>
						<Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
							<CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 bg-slate-50/50">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center shadow-inner">
										<Zap
											className="h-5 w-5 text-amber-500 fill-amber-500"
											aria-hidden="true"
										/>
									</div>
									<div className="text-left">
										<CardTitle className="text-lg font-black text-slate-900">
											Credit Analytics
										</CardTitle>
										<CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
											Consumption by action type
										</CardDescription>
									</div>
								</div>
								<div className="text-xs font-black text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm font-variant-numeric:tabular-nums">
									Total: {totalCreditsConsumed}
								</div>
							</CardHeader>
							<CardContent className="p-6">
								<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
									{creditStats
										.sort((a, b) => b.totalCredits - a.totalCredits)
										.map((stat) => {
											const config = ACTION_LABELS[stat.action] || {
												label: stat.action,
												color: "bg-slate-50 text-slate-600",
												icon: Activity,
											};
											const Icon = config.icon;
											const percentage =
												totalCreditsConsumed > 0
													? Math.round(
															(stat.totalCredits / totalCreditsConsumed) * 100,
														)
													: 0;

											return (
												<div
													key={stat.action}
													className="bg-white rounded-[2rem] border p-4 hover:shadow-md transition-shadow transition-transform flex flex-col gap-3 group border-slate-100 text-left"
												>
													<div className="flex items-center justify-between">
														<div
															className={cn(
																"h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm",
																config.color,
															)}
														>
															<Icon className="h-5 w-5" aria-hidden="true" />
														</div>
														<span className="text-xl font-black text-slate-900 font-variant-numeric:tabular-nums">
															{stat.totalCredits}
														</span>
													</div>
													<div>
														<h4 className="text-[10px] font-black text-slate-600 uppercase tracking-tighter truncate">
															{config.label}
														</h4>
														<div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden shadow-inner">
															<div
																className={cn(
																	"h-full rounded-full transition-all duration-1000",
																	config.color
																		.split(" ")[1]
																		.replace("text", "bg"),
																)}
																style={{ width: `${percentage}%` }}
															/>
														</div>
													</div>
												</div>
											);
										})}
									{creditStats.length === 0 && (
										<div className="col-span-full py-8 text-center text-slate-400 font-bold italic">
											No consumption data yet.
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</section>
				</div>

				{/* Right Column: Platform Stats & Quick Links */}
				<div className="space-y-8">
					{/* Legal KB Overview - DISABLED */}
					{/* <section>
						<Card className="rounded-[2.5rem] border-none shadow-xl shadow-indigo-100 overflow-hidden bg-slate-900 text-white">
							<CardHeader className="flex flex-row items-center justify-between pb-6">
								<div className="space-y-1 text-left">
									<CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
										Legal Assistant (Legal OS)
									</CardDescription>
									<CardTitle className="text-xl font-black">
										Knowledge Base
									</CardTitle>
								</div>
								<div className="h-10 w-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
									<Database
										className="h-5 w-5 text-indigo-400"
										aria-hidden="true"
									/>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-6 text-left font-variant-numeric:tabular-nums">
									<div className="flex items-center justify-between">
										<span className="text-slate-400 text-sm font-bold">
											Jurisdictions
										</span>
										<span className="text-2xl font-black text-white">
											{kbStats.jurisdictions}
										</span>
									</div>
									<div className="flex items-center justify-between py-4 border-y border-slate-800">
										<span className="text-slate-400 text-sm font-bold">
											Categories
										</span>
										<span className="text-2xl font-black text-emerald-400">
											{kbStats.categories}
										</span>
									</div>
									<div className="flex items-center justify-between">
										<span className="text-slate-400 text-sm font-bold">
											Library Documents
										</span>
										<span className="text-2xl font-black text-amber-400">
											{kbStats.documents}
										</span>
									</div>
								</div>
								<div className="pt-8 flex">
									<Button
										asChild
										variant="outline"
										className="w-full bg-transparent border-slate-700 hover:bg-slate-800 text-slate-300 rounded-2xl py-6 font-bold text-xs gap-2 transition-transform active:scale-95"
									>
										<Link href="/dashboard/admin/legal/kb">
											Manage Content{" "}
											<ArrowRight className="ml-2 h-3 w-3" aria-hidden="true" />
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</section> */}

					{/* Quick Stats Grid */}
					<div className="grid grid-cols-2 gap-4 text-left">
						<Card
							className="rounded-3xl border-slate-100 shadow-sm p-6 flex flex-col gap-2 hover:bg-slate-50 transition-colors cursor-pointer active:scale-95 transition-transform"
							onClick={() => (window.location.href = "/dashboard/admin/models")}
						>
							<div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
								<Sparkles
									className="h-5 w-5 text-indigo-600"
									aria-hidden="true"
								/>
							</div>
							<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
								AI Engine
							</p>
							<h4 className="text-lg font-black text-slate-900">
								Manage Models
							</h4>
						</Card>

						<Card
							className="rounded-3xl border-slate-100 shadow-sm p-6 flex flex-col gap-2 hover:bg-slate-50 transition-colors cursor-pointer active:scale-95 transition-transform"
							onClick={() => (window.location.href = "/dashboard/activity")}
						>
							<div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
								<Activity
									className="h-5 w-5 text-emerald-600"
									aria-hidden="true"
								/>
							</div>
							<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
								Operations
							</p>
							<h4 className="text-lg font-black text-slate-900">
								Activity Log
							</h4>
						</Card>
					</div>

					{/* Users Summary */}
					<section>
						<Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white text-left">
							<CardHeader className="pb-2">
								<CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
									Recent Growth
								</CardDescription>
								<CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2 text-wrap-balance">
									<Users
										className="h-5 w-5 text-indigo-600"
										aria-hidden="true"
									/>
									Subscribers
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-slate-500 font-medium leading-relaxed">
									Manage all subscribers, permissions, and pricing plans from
									the industry-specific sections in the sidebar.
								</p>
								<div className="mt-4 flex gap-2">
									<Button
										asChild
										variant="ghost"
										className="text-indigo-600 text-[10px] font-black p-0 hover:bg-transparent"
									>
										<Link href="/dashboard/admin/legal/subscribers">
											Legal Subscribers{" "}
											<ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
										</Link>
									</Button>
								</div>
							</CardContent>
						</Card>
					</section>
				</div>
			</div>

			<ConfirmModal
				isOpen={deleteModalOpen}
				onClose={() => {
					setDeleteModalOpen(false);
					setRequestIdToDelete(null);
				}}
				onConfirm={confirmDelete}
				title="Reject Demo Request"
				description="Are you sure you want to reject this request? No invite code will be generated for this user."
				confirmText="Reject Request"
			/>
		</div>
	);
}
