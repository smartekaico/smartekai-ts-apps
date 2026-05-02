"use client";

import { useActionState } from "react";
import { sendContactEmail } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocale } from "next-intl";

export function ContactForm() {
	const [state, formAction, isPending] = useActionState(sendContactEmail, null);
	const locale = useLocale();

	if (state?.success) {
		return (
			<div className="flex flex-col items-center justify-center p-8 bg-emerald-50 rounded-3xl border border-emerald-100 text-center h-full min-h-[300px]">
				<CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
				<h3 className="text-2xl font-black text-slate-900 mb-2">
					{locale === "ar" ? "شكراً لتواصلك معنا!" : "Thank You!"}
				</h3>
				<p className="text-emerald-700 font-medium max-w-sm">
					{locale === "ar"
						? "لقد تلقينا رسالتك بنجاح. سيقوم فريقنا بالرد عليك في أقرب وقت."
						: "We've securely received your message and our team will be in touch shortly."}
				</p>
			</div>
		);
	}

	return (
		<form action={formAction} className="space-y-6">
			{state?.error && (
				<div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm font-bold">
					<AlertCircle className="h-5 w-5" />
					{state.error}
				</div>
			)}

			<div className="space-y-2">
				<label
					htmlFor="name"
					className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2"
				>
					{locale === "ar" ? "الاسم" : "Name"}
				</label>
				<input
					type="text"
					id="name"
					name="name"
					required
					className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
				/>
			</div>
			<div className="space-y-2">
				<label
					htmlFor="email"
					className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2"
				>
					{locale === "ar" ? "البريد الإلكتروني" : "Email"}
				</label>
				<input
					type="email"
					id="email"
					name="email"
					required
					className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
				/>
			</div>
			<div className="space-y-2">
				<label
					htmlFor="message"
					className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2"
				>
					{locale === "ar" ? "الرسالة" : "Message"}
				</label>
				<textarea
					id="message"
					name="message"
					required
					rows={4}
					className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
				/>
			</div>
			<Button
				type="submit"
				disabled={isPending}
				className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg shadow-xl shadow-indigo-200 transition-all"
			>
				{isPending ? (
					<span className="flex items-center gap-2">
						<Loader2 className="h-5 w-5 animate-spin" />{" "}
						{locale === "ar" ? "جاري الإرسال..." : "Sending..."}
					</span>
				) : locale === "ar" ? (
					"إرسال الرسالة"
				) : (
					"Send Message"
				)}
			</Button>
		</form>
	);
}
