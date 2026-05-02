import { getBlogPostBySlug, getBlogSlugs } from "@/lib/blog";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Calendar, User, Tag, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";

export async function generateStaticParams() {
	const slugs = getBlogSlugs();
	const locales = ["en", "ar"];
	
	const params = [];
	for (const locale of locales) {
		for (const slug of slugs) {
			params.push({ locale, slug });
		}
	}
	return params;
}

export default async function BlogPostPage({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>;
}) {
	const { locale, slug } = await params;
	setRequestLocale(locale);
	
	const post = getBlogPostBySlug(slug, locale);

	if (!post) {
		notFound();
	}

	const isRtl = locale === "ar";

	return (
		<div className="pt-32 pb-20 bg-white min-h-screen">
			<div className="container mx-auto px-6 max-w-4xl">
				{/* Back Button */}
				<Link 
					href="/blog" 
					className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-12 transition-colors group"
				>
					{isRtl ? <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /> : <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />}
					{isRtl ? "العودة للمدونة" : "Back to Blog"}
				</Link>

				{/* Header */}
				<header className="space-y-8 mb-16">
					<div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 rounded-full text-indigo-600 text-xs font-black tracking-widest uppercase border border-indigo-100">
						<Tag className="h-3 w-3" />
						{post.category}
					</div>
					
					<h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
						{post.title}
					</h1>

					<div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-400 uppercase tracking-widest">
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							{new Date(post.date).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</div>
						<div className="flex items-center gap-2">
							<User className="h-4 w-4" />
							{post.author}
						</div>
					</div>

					<p className="text-xl text-slate-500 font-medium leading-relaxed italic border-l-4 border-indigo-500 pl-6 py-2 bg-slate-50/50 rounded-r-2xl">
						{post.excerpt}
					</p>

					<div className="aspect-[21/9] w-full rounded-[2.5rem] overflow-hidden bg-slate-100 shadow-2xl">
						<img 
							src={post.image} 
							alt={post.title} 
							className="w-full h-full object-cover"
						/>
					</div>
				</header>

				{/* Content */}
				<article className={isRtl ? "prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:font-medium prose-p:leading-relaxed prose-a:text-indigo-600 prose-a:font-bold prose-strong:text-slate-900 prose-img:rounded-[2rem] rtl" : "prose prose-slate prose-lg max-w-none prose-headings:font-black prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:font-medium prose-p:leading-relaxed prose-a:text-indigo-600 prose-a:font-bold prose-strong:text-slate-900 prose-img:rounded-[2rem]"}>
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{post.content}
					</ReactMarkdown>
				</article>

				{/* Footer CTA */}
				<div className="mt-20 p-12 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden">
					<div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
					<div className="relative z-10 space-y-6 text-center max-w-2xl mx-auto">
						<h2 className="text-3xl font-black">
							{isRtl ? "جاهز لتحويل أعمالك؟" : "Ready to Transform Your Workflow?"}
						</h2>
						<p className="text-slate-400 font-medium leading-relaxed">
							{isRtl 
								? "انضم إلى آلاف المهنيين الذين يوسعون أعمالهم باستخدام نظام سمارتك الموحد." 
								: "Join thousands of professionals who are scaling their businesses with Smartek's unified intelligent OS."}
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
							<Link href="/contact">
								<button className="px-8 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-indigo-500/20 w-full sm:w-auto">
									{isRtl ? "طلب تجربة مجانية" : "Request a Demo"}
								</button>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
