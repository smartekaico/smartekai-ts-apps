"use client";

import * as React from "react";
import { useState } from "react";
import {
	UserPlus,
	Clock,
	CheckCircle2,
	XCircle,
	MoreHorizontal,
	Copy,
	Zap,
	Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
	generateInvite,
	approveDemoRequest,
	deleteDemoRequest,
	cancelInvite,
} from "@/app/[locale]/actions/admin";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface DemoRequest {
	id: string;
	name: string;
	email: string;
	industry: string;
	company: string | null;
	status: string;
	createdAt: string;
}

interface Invite {
	id: string;
	token: string;
	industryRole: string;
	initialCredits: number;
	status: string;
	email: string | null;
	createdAt: string;
}

export interface AccessManagementViewProps {
	initialDemoRequests: DemoRequest[];
	initialInvites: Invite[];
}

export function AccessManagementView({
	initialDemoRequests = [],
	initialInvites = [],
}: AccessManagementViewProps) {
	const [demoRequests, setDemoRequests] =
		useState<DemoRequest[]>(initialDemoRequests);
	const [invites, setInvites] = useState<Invite[]>(initialInvites);
	const [isGenerating, setIsGenerating] = useState(false);

	// Form State for new invite
	const [newInviteRole, setNewInviteRole] = useState("LEGAL");
	const [newInviteCredits, setNewInviteCredits] = useState("50");

	const copyToClipboard = (token: string) => {
		const url = `${window.location.origin}/invite?token=${token}`;
		navigator.clipboard.writeText(url);
		toast.success("Invite link copied to clipboard!");
	};

	const handleGenerateInvite = async () => {
		setIsGenerating(true);
		const result = await generateInvite(
			newInviteRole,
			Number.parseInt(newInviteCredits),
		);
		setIsGenerating(false);

		if (result.success && result.token) {
			const newInvite: Invite = {
				id: Math.random().toString(36).substr(2, 9),
				token: result.token,
				industryRole: newInviteRole,
				initialCredits: Number.parseInt(newInviteCredits),
				status: "unused",
				email: null,
				createdAt: new Date().toISOString(),
			};
			setInvites([newInvite, ...invites]);
			toast.success("New invite code generated successfully");
		} else {
			toast.error(result.error || "Failed to generate invite");
		}
	};

	const [approvingIds, setApprovingIds] = useState<string[]>([]);
	const [deletingIds, setDeletingIds] = useState<string[]>([]);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [requestIdToDelete, setRequestIdToDelete] = useState<string | null>(
		null,
	);

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
			toast.success("Request deleted successfully");
		} else {
			toast.error(result.error || "Failed to delete request");
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
			toast.success("Request approved and account provisioned!", {
				description: "Magic link sent. If they don't receive it, you can manually copy and send it.",
				action: {
					label: "Copy Link",
					onClick: () => {
						if (result.magicLink) {
							navigator.clipboard.writeText(result.magicLink);
							toast.success("Link copied!");
						}
					},
				},
				duration: 10000,
			});
		} else {
			toast.error(result.error || "An error occurred during approval");
		}
	};

	const handleCancelInvite = async (inviteId: string) => {
		const originalInvites = [...invites];
		setInvites((prev) => prev.filter((i) => i.id !== inviteId));

		const result = await cancelInvite(inviteId);
		if (!result.success) {
			setInvites(originalInvites);
			toast.error(result.error || "Failed to revoke code");
		} else {
			toast.success("Invite code revoked successfully");
		}
	};

	return (
		<div
			className="space-y-6 md:space-y-10 animate-in fade-in duration-700 ltr"
			dir="ltr"
		>
			<header className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left px-1">
				<div className="space-y-1">
					<h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
						Access Management
					</h1>
					<p className="text-slate-500 font-bold text-xs md:text-sm">
						Manage platform invitations and demo requests.
					</p>
				</div>
			</header>

			<Tabs defaultValue="invites" className="flex flex-col w-full space-y-8">
				<TabsList className="bg-slate-100/80 p-1.5 rounded-[1.5rem] h-auto grid grid-cols-2 w-full md:w-[400px] shadow-inner border border-slate-200/50">
					<TabsTrigger
						value="invites"
						className="rounded-[1.1rem] data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 gap-2 py-3 md:py-2.5 font-black text-xs md:text-sm transition-all"
					>
						<UserPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
						Manage Invites
					</TabsTrigger>
					<TabsTrigger
						value="requests"
						className="rounded-[1.1rem] data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 gap-2 py-3 md:py-2.5 font-black text-xs md:text-sm transition-all"
					>
						<Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
						Requests
						{demoRequests.filter((r) => r.status === "pending").length > 0 && (
							<span className="bg-rose-500 text-white text-[10px] font-black h-4 w-4 rounded-full flex items-center justify-center animate-pulse">
								{demoRequests.filter((r) => r.status === "pending").length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent
					value="invites"
					className="space-y-10 mt-0 focus-visible:outline-none animate-in slide-in-from-bottom-2 duration-300"
				>
					<div className="space-y-8">
						<Card className="rounded-[2.5rem] border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden bg-white">
							<CardHeader className="bg-slate-50/40 border-b border-slate-100 px-6 py-8 md:px-10">
								<CardTitle className="text-xl font-black text-slate-900">
									Generate New Invite
								</CardTitle>
								<CardDescription className="text-slate-400 font-bold text-sm">
									Create a custom invitation code for a specific industry OS.
								</CardDescription>
							</CardHeader>
							<CardContent className="p-6 md:p-10 space-y-8">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
									<div className="space-y-3 text-left">
										<label
											className="text-[10px] font-black text-slate-900 uppercase tracking-widest block opacity-60"
											htmlFor="target-system"
										>
											Target System
										</label>
										<Select
											value={newInviteRole}
											onValueChange={(val) => val && setNewInviteRole(val)}
										>
											<SelectTrigger
												id="target-system"
												className="rounded-2xl border-slate-100 bg-slate-50 h-14 font-bold focus-visible:ring-4 focus-visible:ring-indigo-500/5 focus:border-indigo-500/20 transition-all"
											>
												<SelectValue placeholder="Select system…" />
											</SelectTrigger>
											<SelectContent className="rounded-2xl shadow-2xl border-slate-100 p-2">
												<SelectItem
													value="LEGAL"
													className="font-black rounded-xl py-3 px-4 focus:bg-indigo-50 transition-colors"
												>
													Legal OS
												</SelectItem>
												<SelectItem
													value="MEDICAL"
													className="font-black rounded-xl py-3 px-4 focus:bg-indigo-50 transition-colors"
												>
													Clinical Scribe
												</SelectItem>
												<SelectItem
													value="VOICE"
													className="font-black rounded-xl py-3 px-4 focus:bg-indigo-50 transition-colors"
												>
													Voice Ops
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-3 text-left">
										<label
											className="text-[10px] font-black text-slate-900 uppercase tracking-widest block opacity-60"
											htmlFor="initial-credits"
										>
											Initial Credits
										</label>
										<Input
											id="initial-credits"
											type="number"
											value={newInviteCredits}
											onChange={(e) => setNewInviteCredits(e.target.value)}
											className="rounded-2xl border-slate-100 bg-slate-50 h-14 font-black font-variant-numeric:tabular-nums focus-visible:ring-4 focus-visible:ring-indigo-500/5 focus:border-indigo-500/20 transition-all"
										/>
									</div>
								</div>

								<Button
									onClick={handleGenerateInvite}
									disabled={isGenerating}
									className="w-full bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl py-8 font-black text-lg gap-2 shadow-xl shadow-indigo-100 hover:shadow-2xl hover:shadow-slate-200 transition-all active:scale-[0.98]"
								>
									{isGenerating ? (
										<Clock
											className="h-5 w-5 animate-spin"
											aria-hidden="true"
										/>
									) : (
										<Zap
											className="h-5 w-5 fill-amber-400 text-amber-400"
											aria-hidden="true"
										/>
									)}
									Generate Invite Code
								</Button>
							</CardContent>
						</Card>

						<section className="space-y-6">
							<div className="flex items-center justify-between px-2">
								<h3 className="text-xs font-black text-slate-900 uppercase tracking-widest opacity-40">
									Active Codes
								</h3>
								<span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
									{invites.length} Codes Available
								</span>
							</div>

							{invites.length === 0 ? (
								<div className="bg-slate-50/50 rounded-[2.5rem] p-16 border-2 border-dashed border-slate-100 text-center flex flex-col items-center gap-4">
									<div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
										<UserPlus className="h-8 w-8 text-slate-200" />
									</div>
									<p className="text-slate-400 font-bold">
										No active invite codes found.
									</p>
								</div>
							) : (
								<div className="grid grid-cols-1 gap-4">
									{invites.map((invite) => (
										<Card
											key={invite.id}
											className="rounded-[2rem] border-slate-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.03)] overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300"
										>
											<CardContent className="p-5 md:p-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6">
												<div className="flex items-center gap-5 min-w-0">
													<div
														className={cn(
															"h-14 w-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-current/10",
															invite.industryRole === "LEGAL"
																? "bg-indigo-600 shadow-indigo-200"
																: invite.industryRole === "MEDICAL"
																	? "bg-emerald-600 shadow-emerald-200"
																	: "bg-amber-600 shadow-amber-200",
														)}
													>
														{invite.industryRole === "LEGAL" ? (
															<Briefcase
																className="h-7 w-7"
																aria-hidden="true"
															/>
														) : (
															<Zap className="h-7 w-7" aria-hidden="true" />
														)}
													</div>
													<div className="min-w-0 flex-1">
														<div className="flex flex-wrap items-center gap-2 mb-1.5">
															<h3 className="font-mono text-xl md:text-2xl font-black tracking-tighter text-slate-900 leading-none">
																{invite.token}
															</h3>
															<span
																className={cn(
																	"text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0",
																	invite.status === "unused"
																		? "bg-emerald-50 text-emerald-600 border border-emerald-100"
																		: "bg-slate-50 text-slate-400 border border-slate-100",
																)}
															>
																{invite.status === "unused" ? "Valid" : "Used"}
															</span>
														</div>
														<p className="text-[10px] md:text-xs text-slate-400 font-black uppercase tracking-wider flex items-center gap-2">
															{invite.industryRole === "LEGAL"
																? "Legal OS"
																: invite.industryRole === "MEDICAL"
																	? "Medical Scribe"
																	: "Voice Ops"}
															<span className="h-1 w-1 rounded-full bg-slate-200" />
															<span className="text-slate-500 font-variant-numeric:tabular-nums">
																{invite.initialCredits} Credits
															</span>
														</p>
													</div>
												</div>
												<div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0 border-t sm:border-none border-slate-50">
													<Button
														variant="outline"
														className="flex-1 sm:flex-none rounded-xl border-slate-100 bg-slate-50/50 h-12 px-6 shadow-sm hover:border-indigo-600 hover:text-indigo-600 hover:bg-white transition-all gap-2"
														onClick={() => copyToClipboard(invite.token)}
													>
														<Copy className="h-4 w-4" aria-hidden="true" />
														<span className="font-black text-xs uppercase tracking-widest sm:hidden lg:inline">
															Copy Link
														</span>
													</Button>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button
																variant="ghost"
																size="icon"
																className="rounded-xl h-12 w-12 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200/50"
															>
																<MoreHorizontal
																	className="h-5 w-5 text-slate-400"
																	aria-hidden="true"
																/>
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent
															align="end"
															className="rounded-2xl p-2 shadow-2xl border-slate-100 w-48"
														>
															<DropdownMenuItem
																className="text-rose-600 font-black cursor-pointer rounded-xl py-3 px-4 focus:bg-rose-50 transition-colors"
																onSelect={() => handleCancelInvite(invite.id)}
															>
																{invite.status === "unused"
																	? "Revoke Access"
																	: "Archive Invite"}
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
							)}
						</section>
					</div>
				</TabsContent>

				<TabsContent
					value="requests"
					className="mt-0 focus-visible:outline-none animate-in slide-in-from-bottom-2 duration-300"
				>
					<Card className="rounded-[2.5rem] border-slate-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden bg-white">
						<CardHeader className="border-b border-slate-100 bg-slate-50/40 px-8 py-8 md:px-10">
							<CardTitle className="text-xl font-black text-slate-900">
								New Demo Requests
							</CardTitle>
							<CardDescription className="text-slate-400 font-bold text-sm">
								Review and approve incoming access requests.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-0">
							{demoRequests.length === 0 ? (
								<div className="p-20 text-center flex flex-col items-center gap-6">
									<div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-slate-100/50 shadow-inner">
										<Clock
											className="h-10 w-10 text-slate-200"
											aria-hidden="true"
										/>
									</div>
									<p className="text-slate-400 font-bold max-w-xs mx-auto">
										No pending requests at the moment. Your queue is clear!
									</p>
								</div>
							) : (
								<div className="divide-y divide-slate-100">
									{demoRequests.map((request) => (
										<div
											key={request.id}
											className="p-6 md:p-10 flex flex-col gap-8 hover:bg-slate-50/20 transition-all text-left group"
										>
											<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
												<div className="flex items-center gap-5 min-w-0">
													<div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center font-black text-slate-600 shrink-0 border border-slate-100 shadow-sm transition-transform group-hover:scale-105 duration-300">
														{request.name[0]}
													</div>
													<div className="min-w-0 flex-1">
														<h4 className="font-black text-slate-900 truncate text-lg">
															{request.name}
														</h4>
														<p className="text-xs text-slate-500 font-bold truncate flex items-center gap-2">
															{request.email}
															<span className="h-1 w-1 rounded-full bg-slate-200" />
															<span className="text-slate-400 lowercase">
																{request.company || "Individual"}
															</span>
														</p>
													</div>
												</div>
												<div className="text-left sm:text-right shrink-0 flex flex-col items-start sm:items-end gap-1.5">
													<span
														className={cn(
															"text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider border shadow-sm",
															request.industry === "LEGAL"
																? "bg-indigo-50 text-indigo-600 border-indigo-100"
																: request.industry === "MEDICAL"
																	? "bg-emerald-50 text-emerald-600 border-emerald-100"
																	: "bg-amber-50 text-amber-600 border-amber-100",
														)}
													>
														{request.industry} OS
													</span>
													<p className="text-[10px] text-slate-400 font-bold opacity-60 font-variant-numeric:tabular-nums">
														Requested{" "}
														{new Date(request.createdAt).toLocaleDateString(
															undefined,
															{
																month: "short",
																day: "numeric",
																year: "numeric",
															},
														)}
													</p>
												</div>
											</div>

											<footer className="flex items-center justify-end gap-3 pt-6 border-t border-slate-50/50">
												<Button
													className="flex-1 sm:flex-none rounded-2xl text-white bg-emerald-500 hover:bg-slate-900 font-black gap-2 px-8 h-12 shadow-lg shadow-emerald-200 hover:shadow-slate-200 transition-all active:scale-[0.98]"
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
													Approve Early Access
												</Button>
												<Button
													variant="ghost"
													className="rounded-2xl text-rose-600 bg-rose-50/50 hover:bg-rose-100 h-12 w-12 flex items-center justify-center active:scale-[0.98] transition-all border border-transparent hover:border-rose-200/50"
													onClick={() => handleDeleteRequest(request.id)}
													disabled={
														deletingIds.includes(request.id) ||
														approvingIds.includes(request.id)
													}
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
											</footer>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
			<ConfirmModal
				isOpen={deleteModalOpen}
				onClose={() => {
					setDeleteModalOpen(false);
					setRequestIdToDelete(null);
				}}
				onConfirm={confirmDelete}
				title="Delete Demo Request"
				description="Are you sure you want to delete this request? This action cannot be undone."
				confirmText="Delete Request"
			/>
		</div>
	);
}
