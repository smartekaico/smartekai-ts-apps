"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	ShieldCheck,
	FileText,
	Scale,
	Lock,
	Eye,
	AlertCircle,
	ArrowLeft,
	History,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SecurityAndLegalPage() {
	return (
		<div
			className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 rtl text-right"
			dir="rtl"
		>
			{/* Navigation Header */}
			<div className="flex items-center justify-between">
				<Link href="/dashboard/settings">
					<Button
						variant="ghost"
						className="rounded-2xl gap-2 text-slate-500 hover:text-slate-900 pr-1 pl-4 h-11 border border-transparent hover:border-slate-100 hover:bg-white shadow-sm transition-all duration-300"
					>
						<ArrowLeft className="h-4 w-4" />
						<span className="font-bold text-sm">العودة للإعدادات</span>
					</Button>
				</Link>
				<div className="flex items-center gap-3">
					<span className="px-3 py-1 bg-slate-100 text-slate-700 text-[11px] font-black rounded-lg border border-slate-200 tracking-tight uppercase">
						Privacy & Security
					</span>
				</div>
			</div>

			{/* Hero Section */}
			<div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
				<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl -z-0 rounded-full" />
				<div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
					<div>
						<h1 className="text-4xl font-black tracking-tight text-slate-900 mb-3">
							الخصوصية والأمان (Privacy)
						</h1>
						<p className="text-slate-500 text-lg font-medium max-w-2xl leading-relaxed">
							تحكم في خصوصية بياناتك واطلع على سياسات المنصة وإعدادات الأمان
							المتقدمة.
						</p>
					</div>
					<div className="h-20 w-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
						<ShieldCheck className="h-10 w-10" />
					</div>
				</div>
			</div>

			{/* Main Content Area */}
			<Tabs defaultValue="privacy" className="space-y-8 h-full">
				<div className="flex justify-center overflow-x-auto pb-4 md:pb-0">
					<TabsList className="bg-white border border-slate-100 p-1.5 rounded-[2rem] h-16 shadow-sm min-w-max">
						<TabsTrigger
							value="privacy"
							className="rounded-[1.5rem] px-6 md:px-8 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-sm transition-all duration-300 flex items-center gap-2"
						>
							<Eye className="h-4 w-4" />
							سياسة الخصوصية
						</TabsTrigger>
						<TabsTrigger
							value="security"
							className="rounded-[1.5rem] px-6 md:px-8 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-sm transition-all duration-300 flex items-center gap-2"
						>
							<Lock className="h-4 w-4" />
							تأمين الحساب
						</TabsTrigger>
						<TabsTrigger
							value="activity"
							className="rounded-[1.5rem] px-6 md:px-8 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-sm transition-all duration-300 flex items-center gap-2"
						>
							<History className="h-4 w-4" />
							سجل النشاط
						</TabsTrigger>
						<TabsTrigger
							value="terms"
							className="rounded-[1.5rem] px-6 md:px-8 data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black text-sm transition-all duration-300 flex items-center gap-2"
						>
							<Scale className="h-4 w-4" />
							الشروط (ToS)
						</TabsTrigger>
					</TabsList>
				</div>

				{/* 1. Privacy Policy Tab */}
				<TabsContent
					value="privacy"
					className="animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none"
				>
					<Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
						<CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
							<div>
								<CardTitle className="text-2xl font-black text-slate-900 mb-2">
									سياسة الخصوصية (Privacy Policy)
								</CardTitle>
								<CardDescription className="text-slate-500 font-bold">
									التزامنا بحماية بياناتك وحقوقك الرقمية.
								</CardDescription>
							</div>
							<div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
								<Eye className="h-6 w-6" />
							</div>
						</CardHeader>
						<CardContent className="p-10">
							<ScrollArea className="h-[500px] border border-slate-100 bg-white p-8 rounded-[2rem] ring-8 ring-slate-50/50">
								<div className="prose prose-slate max-w-none space-y-10 rtl text-right font-medium leading-relaxed">
									<section>
										<h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-4">
											<div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 text-sm">
												1
											</div>
											جمع البيانات
										</h3>
										<p className="text-slate-600 text-lg">
											نحن نجمع فقط المعلومات الضرورية لتوصيل خدماتنا وتحسين
											تجربتك، مثل معلومات الحساب وبيانات الاستخدام التقنية.
										</p>
									</section>
									<section>
										<h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-4">
											<div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 text-sm">
												2
											</div>
											تشفير البيانات
										</h3>
										<p className="text-slate-600 text-lg">
											تخضع جميع البيانات لمعايير تشفير AES-256 أثناء التخزين
											والنقل (SSL/TLS)، مما يضمن استحالة الوصول إليها من أطراف
											غير مصرح لها.
										</p>
									</section>
									<section>
										<h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-4">
											<div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 text-sm">
												3
											</div>
											بيانات الذكاء الاصطناعي
										</h3>
										<p className="text-slate-600 text-lg">
											نحن لا نستخدم بياناتك الخاصة لتدريب نماذج الذكاء الاصطناعي
											العامة. تظل بياناتك ملكك وحدك ولا تخرج من بيئتك الآمنة.
										</p>
									</section>
									<div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-start gap-4">
										<ShieldCheck className="h-6 w-6 text-indigo-600 shrink-0 mt-1" />
										<p className="text-indigo-800 text-sm font-bold leading-relaxed">
											خصوصيتك هي وعدنا. يمكنك طلب حذف حسابك وبياناتك المرتبطة به
											بالكامل في أي وقت.
										</p>
									</div>
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</TabsContent>

				{/* 2. Security Settings Tab */}
				<TabsContent
					value="security"
					className="animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none"
				>
					<Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
						<CardHeader className="p-10">
							<CardTitle className="text-2xl font-black text-slate-900 mb-2">
								تأمين الحساب (Security)
							</CardTitle>
							<CardDescription className="text-slate-500 font-bold">
								إدارة طرق الدخول والمصادقة المتقدمة.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-10 pt-0">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col gap-4 opacity-70 grayscale cursor-not-allowed border-dashed">
									<div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
										<Lock className="h-6 w-6" />
									</div>
									<h4 className="font-black text-slate-900">
										المصادقة الثنائية (2FA)
									</h4>
									<p className="text-sm text-slate-500 font-medium leading-relaxed">
										أضف طبقة حماية إضافية عبر الربط مع تطبيقات المصادقة (Google
										Authenticator) - قريباً.
									</p>
								</div>
								<div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col gap-4">
									<div className="h-12 w-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center">
										<Eye className="h-6 w-6" />
									</div>
									<h4 className="font-black text-slate-900">
										تفضيلات الخصوصية
									</h4>
									<p className="text-sm text-slate-500 font-medium leading-relaxed">
										التحكم في إظهار نشاطك لمديري الفريق أو إبقائه خاصاً.
									</p>
									<Button
										variant="outline"
										className="mt-2 rounded-xl h-10 font-bold border-slate-200"
									>
										تعديل الإعدادات
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* 3. Activity Logs Tab */}
				<TabsContent
					value="activity"
					className="animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none"
				>
					<Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
						<CardHeader className="p-10">
							<CardTitle className="text-2xl font-black text-slate-900 mb-2">
								سجل الولوج والنشاط (Activity Logs)
							</CardTitle>
							<CardDescription className="text-slate-500 font-bold">
								مراقبة كافة محاولات الدخول والعمليات الحساسة.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-10 pt-0">
							<div className="bg-white border border-slate-100 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center gap-6 min-h-[300px] border-dashed">
								<div className="h-20 w-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center">
									<History className="h-10 w-10" />
								</div>
								<div>
									<h4 className="font-black text-slate-900 text-lg mb-2">
										لا توجد سجلات حالية
									</h4>
									<p className="text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
										سيتم تفعيل سجلات الولوج المتقدمة قريباً لمراقبة أمان حسابك
										بشكل دقيق وحمايته من الولوج غير المصرح به.
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* 4. Terms Tab */}
				<TabsContent
					value="terms"
					className="animate-in fade-in slide-in-from-bottom-2 duration-500 outline-none"
				>
					<Card className="rounded-[3rem] border-slate-100 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
						<CardHeader className="p-10 pb-0 flex flex-row items-center justify-between">
							<div>
								<CardTitle className="text-2xl font-black text-slate-900 mb-2">
									شروط الخدمة (ToS)
								</CardTitle>
								<CardDescription className="text-slate-500 font-bold">
									آخر تحديث: 6 أبريل 2026
								</CardDescription>
							</div>
							<div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
								<Scale className="h-6 w-6" />
							</div>
						</CardHeader>
						<CardContent className="p-10">
							<ScrollArea className="h-[500px] border border-slate-100 bg-white p-8 rounded-[2rem] ring-8 ring-slate-50/50">
								<div className="prose prose-slate max-w-none space-y-10 rtl text-right font-medium leading-relaxed">
									<section>
										<h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-4">
											<div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 text-sm">
												1
											</div>
											القبول والمسؤولية
										</h3>
										<p className="text-slate-600 text-lg">
											باستخدامك للمنصة، فإنك توافق على الالتزام بكافة الشروط.
											المستخدم مسؤول عن دقة البيانات المدخلة ومراجعة مخرجات
											الذكاء الاصطناعي.
										</p>
									</section>
									<section>
										<h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-4">
											<div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 text-sm">
												2
											</div>
											الملكية الفكرية
										</h3>
										<p className="text-slate-600 text-lg">
											كافة البرمجيات والعلامات التجارية هي ملك لـ Smartek AI. لا
											يجوز استنساخ أي جزء من الأكواد أو التصاميم دون إذن.
										</p>
									</section>
									<section>
										<h3 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-4">
											<div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 text-sm">
												3
											</div>
											حدود المسؤولية
										</h3>
										<p className="text-slate-600 text-lg">
											المنصة أداة مساعدة ولا تغني عن الاستشارة المهنية المتخصصة.
											نحن غير مسؤولين عن أي قرارات تتخذ بناءً على المخرجات فقط.
										</p>
									</section>
									<div className="p-8 bg-amber-50 border border-amber-100 rounded-[2rem] flex items-start gap-4">
										<AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-1" />
										<p className="text-amber-800 text-sm font-bold leading-relaxed">
											هذه الشروط هي نماذج تجريبية وسيتم استبدالها قريباً بالصياغة
											القانونية النهائية المعتمدة.
										</p>
									</div>
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
