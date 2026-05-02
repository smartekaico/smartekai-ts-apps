"use client";

import type * as React from "react";
import { useState } from "react";
import {
	Bot,
	CheckCircle2,
	AlertCircle,
	Database,
	Zap,
	Plus,
	ShieldCheck,
	HeartPulse,
	Scale,
	Globe,
	Layers,
	Settings2,
	Sparkles,
	Trash2,
	Cpu,
	History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface Model {
	id: string;
	name: string;
	provider: string;
	isActive: boolean;
	createdAt: string;
}

interface Product {
	id: string;
	activeLlmModelId: string;
	updatedAt: Date | string;
}

interface ModelManagementClientProps {
	initialModels: Model[];
	initialProducts: Product[];
}

export function ModelManagementClient({
	initialModels = [],
	initialProducts = [],
}: ModelManagementClientProps) {
	const t = useTranslations("Admin");
	const router = useRouter();

	const [models, setModels] = useState<Model[]>(initialModels || []);
	const [productsState, setProductsState] = useState<Product[]>(
		initialProducts || [],
	);
	const [activeTab, setActiveTab] = useState<string>(
		initialProducts?.length > 0 ? initialProducts[0].id : "legal-assistant-os",
	);

	const [isLoading, setIsLoading] = useState(false);
	const [isUpdating, setIsUpdating] = useState<string | null>(null);

	// New Model Form State
	const [newModelId, setNewModelId] = useState("");
	const [newModelName, setNewModelName] = useState("");
	const [newModelProvider, setNewModelProvider] = useState("OpenRouter");
	const [customProviderName, setCustomProviderName] = useState("");

	const activeProduct = productsState.find((p) => p.id === activeTab);
	const activeModelId = activeProduct?.activeLlmModelId;

	const handleSetActive = async (modelId: string) => {
		setIsUpdating(modelId);
		try {
			const response = await fetch("/api/admin/models/active", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ modelId, productId: activeTab }),
			});

			if (response.ok) {
				setProductsState((prev) =>
					prev.map((p) =>
						p.id === activeTab ? { ...p, activeLlmModelId: modelId } : p,
					),
				);
				toast.success("Model activated successfully");
				router.refresh();
			} else {
				toast.error("Failed to update active model");
			}
		} catch (error) {
			toast.error("An unexpected error occurred");
		} finally {
			setIsUpdating(null);
		}
	};

	const handleAddModel = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newModelId || !newModelName) return;

		const finalProvider =
			newModelProvider === "Custom" ? customProviderName : newModelProvider;

		setIsLoading(true);
		try {
			const response = await fetch("/api/admin/models", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					id: newModelId,
					name: newModelName,
					provider: finalProvider,
				}),
			});

			if (response.ok) {
				toast.success("Model added successfully");
				const newModel: Model = {
					id: newModelId,
					name: newModelName,
					provider: finalProvider,
					isActive: true,
					createdAt: new Date().toISOString(),
				};
				setModels([newModel, ...models]);
				setNewModelId("");
				setNewModelName("");
				setCustomProviderName("");
				setNewModelProvider("OpenRouter");
				router.refresh();
			} else {
				const errorData = await response.json();
				toast.error(errorData.error || "Failed to add model");
			}
		} catch (error) {
			toast.error("Failed to process request");
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteModel = async (modelId: string) => {
		if (!confirm("Are you sure you want to permanently delete this model?"))
			return;

		try {
			const response = await fetch(`/api/admin/models?id=${modelId}`, {
				method: "DELETE",
			});

			if (response.ok) {
				setModels((prev) => prev.filter((m) => m.id !== modelId));
				toast.success("Model deleted successfully");
			} else {
				const data = await response.json();
				toast.error(data.error || "Failed to delete model");
			}
		} catch (error) {
			toast.error("Unexpected error occurred");
		}
	};

	return (
		<div className="space-y-8 animate-in fade-in duration-700 ltr" dir="ltr">
			{/* Header */}
			{/* Header */}
			<nav className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
				<div className="space-y-1">
					<div className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-1">
						<ShieldCheck className="h-3 w-3" aria-hidden="true" />
						Control Center
					</div>
					<h1 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
						<Bot
							className="h-6 w-6 md:h-9 md:w-9 text-indigo-600"
							aria-hidden="true"
						/>
						LLM Models
					</h1>
					<p className="text-slate-500 font-medium text-[11px] md:text-sm">
						Control the “Master Mind” for each sector.
					</p>
				</div>
			</nav>

			<div className="flex flex-col gap-8">
				{/* Top Section: Add Model Form */}
				<section className="w-full -mx-4 md:mx-0 w-[calc(100%+2rem)] md:w-full">
					<Card className="rounded-none md:rounded-[2rem] border-slate-100 shadow-xl overflow-hidden bg-white">
						<CardHeader className="bg-slate-50/50 border-b p-6 md:p-8">
							<CardTitle className="text-lg md:text-2xl font-black text-slate-900 flex items-center gap-3">
								<Plus className="h-5 w-5 text-indigo-600" aria-hidden="true" />
								Add New Model
							</CardTitle>
							<CardDescription className="text-[10px] md:text-sm font-bold opacity-70 uppercase tracking-tight">
								Expand your Hub’s intelligence.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-6 md:p-8">
							<form onSubmit={handleAddModel} className="space-y-6">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
									<div className="space-y-2 text-left">
										<label
											className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2"
											htmlFor="model-id"
										>
											Model ID
										</label>
										<Input
											id="model-id"
											placeholder="e.g. anthropic/claude-3-5-sonnet…"
											value={newModelId}
											onChange={(e) => setNewModelId(e.target.value)}
											className="rounded-2xl h-12 border-slate-200 text-left font-mono font-bold focus-visible:ring-2 focus-visible:ring-indigo-600"
											dir="ltr"
											autoComplete="off"
										/>
									</div>

									<div className="space-y-2 text-left">
										<label
											className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2"
											htmlFor="friendly-name"
										>
											Friendly Name
										</label>
										<Input
											id="friendly-name"
											placeholder="Claude 3.5 Sonnet…"
											value={newModelName}
											onChange={(e) => setNewModelName(e.target.value)}
											className="rounded-2xl h-12 border-slate-200 font-black focus-visible:ring-2 focus-visible:ring-indigo-600"
											autoComplete="off"
										/>
									</div>

									<div className="space-y-2 text-left">
										<label
											className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2"
											htmlFor="provider-select"
										>
											Provider
										</label>
										<Select
											value={newModelProvider}
											onValueChange={(val) => val && setNewModelProvider(val)}
										>
											<SelectTrigger
												id="provider-select"
												className="rounded-2xl h-12 border-slate-200 font-bold text-left focus-visible:ring-2 focus-visible:ring-indigo-600"
											>
												<SelectValue placeholder="Select provider…" />
											</SelectTrigger>
											<SelectContent className="rounded-2xl shadow-2xl border-slate-100 min-w-[280px]">
												<SelectItem
													value="OpenRouter"
													className="font-bold rounded-xl py-3 focus:bg-indigo-50"
												>
													OpenRouter (Default)
												</SelectItem>
												<SelectItem
													value="Google"
													className="font-bold rounded-xl py-3 focus:bg-indigo-50"
												>
													Google Gemini (Direct)
												</SelectItem>
												<SelectItem
													value="Groq"
													className="font-bold rounded-xl py-3 focus:bg-indigo-50"
												>
													Groq (Ultra Fast)
												</SelectItem>
												<SelectItem
													value="Together"
													className="font-bold rounded-xl py-3 focus:bg-indigo-50"
												>
													Together AI
												</SelectItem>
												<SelectItem
													value="OpenAI"
													className="font-bold rounded-xl py-3 focus:bg-indigo-50"
												>
													OpenAI Direct
												</SelectItem>
												<SelectItem
													value="Anthropic"
													className="font-bold rounded-xl py-3 focus:bg-indigo-50"
												>
													Anthropic Direct
												</SelectItem>
												<SelectItem
													value="Custom"
													className="font-bold rounded-xl py-3 focus:bg-indigo-50 text-indigo-600 italic"
												>
													Other / Custom Provider
												</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								{newModelProvider === "Custom" && (
									<div className="space-y-2 text-left animate-in slide-in-from-top-2 duration-300">
										<label
											className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2"
											htmlFor="custom-provider"
										>
											Custom Provider Name
										</label>
										<Input
											id="custom-provider"
											placeholder="e.g. Perplexity…"
											value={customProviderName}
											onChange={(e) => setCustomProviderName(e.target.value)}
											className="rounded-2xl h-12 border-indigo-100 font-bold focus-visible:ring-2 focus-visible:ring-indigo-600 bg-indigo-50/30 text-left"
											dir="ltr"
											autoComplete="off"
										/>
									</div>
								)}

								<Button
									type="submit"
									disabled={isLoading || !newModelId || !newModelName}
									className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl h-14 font-black gap-3 shadow-xl transition-transform transition-opacity active:scale-95"
								>
									{isLoading ? (
										<Zap
											className="h-5 w-5 animate-spin"
											aria-hidden="true"
										/>
									) : (
										<Plus className="h-5 w-5" aria-hidden="true" />
									)}
									Register New Model
								</Button>
							</form>
						</CardContent>
					</Card>
				</section>

				<Tabs
					value={activeTab}
					onValueChange={setActiveTab}
					className="w-full"
				>
					{/* Contextual Title & Tabs */}
					<div className="flex flex-col items-start mb-10 gap-5 -mx-4 md:mx-0 px-4 md:px-0">
						<div className="flex items-center gap-2 text-[10px] md:text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50/50 px-4 py-2 rounded-full border border-indigo-100/50 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
							<Globe className="h-3.5 w-3.5" aria-hidden="true" />
							Domain Configuration
						</div>

						<TabsList className="bg-slate-100/80 p-1 rounded-2xl h-auto flex w-full sm:w-auto shadow-inner border border-slate-200/50">
							<TabsTrigger
								value="legal-assistant-os"
								className="rounded-xl flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 px-8 py-3 font-black text-xs md:text-sm transition-all gap-2"
							>
								<Scale className="h-4 w-4 shrink-0" aria-hidden="true" />
								Legal
							</TabsTrigger>
							<TabsTrigger
								value="medical-scribe-os"
								className="rounded-xl flex-1 sm:flex-none data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-rose-500 px-8 py-3 font-black text-xs md:text-sm transition-all gap-2"
							>
								<HeartPulse className="h-4 w-4 shrink-0" aria-hidden="true" />
								Medical
							</TabsTrigger>
						</TabsList>
					</div>


						{/* Render Tabs Content for each product type */}
						{["legal-assistant-os", "medical-scribe-os"].map((tabId) => {
							const tabProduct = productsState.find((p) => p.id === tabId);
							const tabActiveModelId = tabProduct?.activeLlmModelId;
							const isRose = tabId === "medical-scribe-os";

							return (
								<TabsContent
									key={tabId}
									value={tabId}
									className="mt-0 space-y-6 focus-visible:outline-none"
								>
									<header className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-2 text-left gap-4">
										<h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 text-wrap-balance">
											<Layers
												className={cn(
													"h-5 w-5 shrink-0",
													isRose ? "text-rose-500" : "text-indigo-500",
												)}
												aria-hidden="true"
											/>
											Available Models
										</h2>
										<Badge
											className={cn(
												"font-bold font-variant-numeric:tabular-nums",
												isRose
													? "bg-rose-50 text-rose-700 border-rose-100"
													: "bg-indigo-50 text-indigo-700 border-indigo-100",
											)}
										>
											{models.length} options available
										</Badge>
									</header>

									<div className="grid grid-cols-1 gap-6 -mx-4 md:mx-0">
										{models.map((model) => (
											<Card
												key={model.id}
												className={cn(
													"relative overflow-hidden transition-all duration-300 border-2 rounded-none md:rounded-[2rem]",
													tabActiveModelId === model.id
														? isRose
															? "ring-2 ring-rose-500 bg-rose-50/10 shadow-rose-100 border-rose-200"
															: "ring-2 ring-indigo-600 bg-indigo-50/10 shadow-indigo-100 border-indigo-200"
														: "hover:border-slate-300 hover:shadow-md border-slate-100",
												)}
											>
												<CardContent className="p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
													<div className="flex items-start sm:items-center gap-4 w-full md:w-auto flex-col sm:flex-row text-center sm:text-left">
														<div
															className={cn(
																"h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm mx-auto sm:mx-0",
																tabActiveModelId === model.id
																	? isRose
																		? "bg-rose-500 text-white border-rose-400"
																		: "bg-indigo-600 text-white border-indigo-500"
																	: "bg-white text-slate-400 border-slate-200",
															)}
														>
															<Bot className="h-6 w-6" aria-hidden="true" />
														</div>
														<div className="flex flex-col space-y-2 sm:space-y-1 w-full">
															<div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
																<h3 className="font-bold text-slate-900 text-base sm:text-lg text-center sm:text-left">
																	{model.name}
																</h3>
																{tabActiveModelId === model.id && (
																	<Badge
																		className={cn(
																			"px-2 py-0.5 mt-1 sm:mt-0",
																			isRose
																				? "bg-rose-500 text-white"
																				: "bg-indigo-600 text-white",
																		)}
																	>
																		Active
																	</Badge>
																)}
															</div>
															<div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-[10px] sm:text-xs text-slate-500 font-medium capitalize">
																<span className="flex items-center gap-1.5 shrink-0">
																	<Cpu className="h-3 w-3 shrink-0" /> <span className="truncate">{model.provider}</span>
																</span>
																<span className="hidden sm:block h-1 w-1 rounded-full bg-slate-300 shrink-0" />
																<span
																	className="flex items-center gap-1.5 shrink-0"
																	title={model.createdAt}
																>
																	<History className="h-3 w-3 shrink-0" />{" "}
																	{model.createdAt.split("T")[0]}
																</span>
															</div>
														</div>
													</div>

													<div className="shrink-0 flex items-center gap-2 w-full md:w-auto justify-center">
														{tabActiveModelId !== model.id ? (
															<Button
																variant="outline"
																size="lg"
																disabled={isUpdating !== null}
																onClick={() => handleSetActive(model.id)}
																className={cn(
																	"rounded-2xl border-slate-200 font-black transition-all gap-2 px-6 h-12 shadow-sm w-full md:w-auto text-xs md:text-sm",
																	isRose
																		? "text-rose-600 hover:bg-rose-500 hover:text-white hover:border-rose-500"
																		: "text-slate-900 hover:bg-indigo-600 hover:text-white hover:border-indigo-600",
																)}
															>
																{isUpdating === model.id ? (
																	<Zap
																		className="h-4 w-4 animate-spin"
																		aria-hidden="true"
																	/>
																) : (
																	<Sparkles
																		className="h-4 w-4"
																		aria-hidden="true"
																	/>
																)}
																Set as Default
															</Button>
														) : (
															<div
																className={cn(
																	"h-12 px-6 flex items-center justify-center rounded-2xl text-[10px] md:text-[11px] font-black border gap-2 w-full md:w-auto",
																	isRose
																		? "bg-rose-50 text-rose-600 border-rose-100"
																		: "bg-indigo-50 text-indigo-600 border-indigo-100",
																)}
															>
																<CheckCircle2
																	className="h-4 w-4"
																	aria-hidden="true"
																/>
																Primary Processor
															</div>
														)}

														{!productsState.some(
															(p) => p.activeLlmModelId === model.id,
														) && (
															<Button
																variant="ghost"
																size="icon"
																onClick={() => handleDeleteModel(model.id)}
																aria-label={`Delete ${model.name} model`}
																className="h-12 w-12 rounded-2xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-transform transition-opacity"
															>
																<Trash2
																	className="h-5 w-5"
																	aria-hidden="true"
																/>
															</Button>
														)}
													</div>
												</CardContent>
											</Card>
										))}
									</div>
						</TabsContent>
					);
				})}
				</Tabs>

				{/* Bottom Section: Warning Banner */}
				<section className="w-full">
					<div className="bg-slate-950 rounded-3xl md:rounded-[4rem] p-8 sm:p-12 text-white overflow-hidden relative group mt-12 border-4 border-slate-900 shadow-2xl">
						<div className="absolute top-[-40px] right-[-40px] h-64 w-64 bg-indigo-600/30 rounded-full blur-[80px] group-hover:bg-indigo-600/50 transition-opacity duration-1000" />
						<div className="absolute bottom-[-40px] left-[-40px] h-48 w-48 bg-rose-600/20 rounded-full blur-[60px] group-hover:bg-rose-600/40 transition-opacity duration-1000" />
						<div className="relative z-10 space-y-8 text-left">
							<div className="flex items-center gap-4">
								<div className="h-14 w-14 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/50 shadow-inner">
									<AlertCircle
										className="h-8 w-8 text-amber-500"
										aria-hidden="true"
									/>
								</div>
								<h4 className="text-2xl md:text-3xl font-black tracking-tight italic uppercase">
									Update Protocol
								</h4>
							</div>
							<p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-4xl text-wrap-balance">
								Changing the active model for{" "}
								<strong className="text-indigo-400 font-black underline decoration-indigo-400/30 decoration-4 underline-offset-8">
									“
									{activeTab === "legal-assistant-os"
										? "Legal Assistant"
										: "Medical Scribe"}
									”
								</strong>{" "}
								is a sovereign action that affects user experience immediately.
								Please verify performance in a staging environment before global
								deployment.
							</p>
							<footer className="pt-8 flex flex-wrap items-center gap-8 border-t border-white/10 opacity-60">
								<div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
									<ShieldCheck className="h-5 w-5" aria-hidden="true" />{" "}
									End-to-End Encrypted
								</div>
								<div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
									<Database className="h-5 w-5" aria-hidden="true" /> Active
									Audit Log
								</div>
							</footer>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}

function Badge({
	children,
	className,
}: { children: React.ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"text-[10px] uppercase tracking-widest px-3 py-1 rounded-full",
				className,
			)}
		>
			{children}
		</div>
	);
}
