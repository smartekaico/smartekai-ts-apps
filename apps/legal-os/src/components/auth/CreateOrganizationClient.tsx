"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Building2, Plus, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateOrganizationClient() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name) return;

		setIsLoading(true);
		try {
			const { data, error } = await (authClient as any).organization.create({
				name,
				slug: name.toLowerCase().replace(/\s+/g, "-"),
			});

			if (error) throw error;

			if (data) {
				// Set the new organization as active
				await (authClient as any).organization.setActive({
					organizationId: data.id,
				});

				toast.success("تم تشييد المكتب الرقمي بنجاح");
				router.refresh();
				router.push("/dashboard/settings/team");
			}
		} catch (err) {
			toast.error((err instanceof Error ? err.message : null) || "فشل في إنشاء المؤسسة");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className="rounded-[2.5rem] border-slate-100 shadow-[0_20px_50px_rgba(79,70,229,0.1)] overflow-hidden bg-white group relative">
			<div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -z-0 rounded-full" />
			<CardHeader className="p-8 pb-4">
				<div className="flex items-center gap-4 mb-4">
					<div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 rotate-3 group-hover:rotate-0 transition-transform duration-500">
						<Building2 className="h-7 w-7" />
					</div>
					<div>
						<CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
							تشييد المكتب القانوني
						</CardTitle>
						<CardDescription className="text-slate-500 font-bold">
							ابدأ بتأسيس هويتك المؤسسية لإدارة فريقك باحترافية.
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-8 pt-4 space-y-6">
				<form onSubmit={handleCreate} className="space-y-6">
					<div className="space-y-3">
						<label 
							htmlFor="org-name"
							className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2"
						>
							اسم المكتب / المؤسسة
						</label>
						<div className="relative group/input">
							<Input
								id="org-name"
								placeholder="مثلاً: شركة المحاماة الدولية"
								value={name}
								onChange={(e) => setName(e.target.value)}
								className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-lg pr-12 focus:ring-2 focus:ring-indigo-600 transition-all"
								required
							/>
							<Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-400 opacity-50 group-hover/input:opacity-100 transition-opacity" />
						</div>
					</div>

					<div className="pt-4 space-y-4">
						<Button
							type="submit"
							disabled={isLoading || !name}
							className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-lg gap-3 shadow-2xl active:scale-95 transition-all"
						>
							{isLoading ? (
								<Loader2 className="h-6 w-6 animate-spin" />
							) : (
								<Plus className="h-6 w-6" />
							)}
							سجل مكتبك الآن
						</Button>
						<p className="text-[10px] text-center text-slate-400 font-bold leading-relaxed">
							من خلال الضغط على "سجل مكتبك"، سيتم منحك صلاحيات "مالك المؤسسة"
							(Owner) وبدء دورة العمل الاحترافية.
						</p>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
