import { getAllBlogPosts } from "@/lib/blog";
import { FileText, Sparkles, Clock, User, ArrowRight, Tag } from "lucide-react";
import { Link } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export const metadata = {
	title: "Blog | AI Insights for Law Firms, Healthcare, and Workflow Automation",
	description:
		"Read insights, guides, and updates on AI for law firms, healthcare, legal automation, medical documentation, and compound AI SaaS workflows.",
};

export default async function BlogPage({
	params,
}: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	setRequestLocale(locale);
	
	const posts = getAllBlogPosts(locale);
	const isRtl = locale === "ar";

	return (
		<div className="pt-32 pb-20 bg-slate-50 min-h-screen">
			<div className="container mx-auto px-6 max-w-6xl">
				<div className="text-center space-y-4 mb-16">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-sm font-black tracking-widest uppercase border border-indigo-100">
						<FileText className="h-4 w-4" />
						{isRtl ? "المدونة والتحليلات" : "Blog & Insights"}
					</div>
					<h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-tight">
						{isRtl ? "مستقبل العمل المهني." : "The future of professional work."}
					</h1>
					<p className="text-slate-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
						{isRtl
							? "استكشف أحدث المقالات والتحليلات حول الذكاء الاصطناعي والأتمتة في القطاعات القانونية والطبية والمؤسسية."
							: "Explore the latest articles and analyses about AI, automation, and intelligent systems in legal, medical, and enterprise sectors."}
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{posts.map((post, index) => (
						<Link
							key={post.slug}
							href={`/blog/${post.slug}`}
							className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col"
						>
							<div className="h-56 bg-slate-100 relative overflow-hidden group-hover:scale-105 transition-transform duration-700">
								<img 
									src={post.image} 
									alt={post.title} 
									className="absolute inset-0 w-full h-full object-cover"
								/>
								<div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors duration-500" />
								<div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full border border-white text-[10px] font-black text-indigo-600 uppercase tracking-widest z-10 shadow-sm">
									{post.category}
								</div>
								<div className="absolute inset-0 flex items-center justify-center translate-y-10 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
									<div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-100">
										<ArrowRight className={isRtl ? "h-6 w-6 text-indigo-600 rotate-180" : "h-6 w-6 text-indigo-600"} />
									</div>
								</div>
							</div>
							<div className="p-8 space-y-6 flex-grow flex flex-col">
								<div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
									<div className="flex items-center gap-1.5">
										<Clock className="h-3 w-3" /> 
										{new Date(post.date).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
											year: 'numeric',
											month: 'short',
											day: 'numeric'
										})}
									</div>
									<span className="h-1 w-1 bg-slate-300 rounded-full" />
									<div className="flex items-center gap-1.5">
										<User className="h-3 w-3" /> {post.author}
									</div>
								</div>
								<h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
									{post.title}
								</h3>
								<p className="text-slate-500 font-bold text-sm leading-relaxed line-clamp-3 mb-4">
									{post.excerpt}
								</p>
								<div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between group-hover:border-indigo-50 transition-colors">
									<span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
										{isRtl ? "اقرأ المزيد" : "Read More"}
									</span>
									<ArrowRight className={isRtl ? "h-4 w-4 text-indigo-600 rotate-180" : "h-4 w-4 text-indigo-600"} />
								</div>
							</div>
						</Link>
					))}
				</div>

				{posts.length === 0 && (
					<div className="py-20 text-center space-y-4 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
						<FileText className="h-12 w-12 text-slate-300 mx-auto" />
						<p className="text-slate-400 font-bold">
							{isRtl ? "لا توجد مقالات حالياً." : "No articles found currently."}
						</p>
					</div>
				)}

				<div className="mt-20 p-12 bg-white rounded-[4rem] border border-slate-100 shadow-xl border-dashed relative overflow-hidden">
					<div className="relative z-10 flex flex-col items-center gap-4 text-center">
						<Sparkles className="h-12 w-12 text-amber-400" />
						<h4 className="text-2xl font-black text-slate-900">
							{isRtl ? "ابقَ على اطلاع." : "Stay Informed."}
						</h4>
						<p className="text-slate-500 font-bold max-w-lg leading-relaxed">
							{isRtl
								? "اشترك في نشرتنا الإخبارية لتصلك آخر المستجدات مباشرة في بريدك."
								: "Subscribe to our newsletter to receive the latest updates directly in your inbox."}
						</p>
						<div className="w-full max-w-md h-16 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse mt-4 cursor-not-allowed opacity-50" />
					</div>
				</div>
			</div>
		</div>
	);
}
