import { getTranslations, setRequestLocale } from "next-intl/server";
import { Construction } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default async function EducationPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);
	const t = await getTranslations({ locale, namespace: "Header" });

	return (
		<div className="flex-grow pt-32 pb-24 bg-white flex items-center justify-center min-h-[70vh]">
			<div className="text-center px-6 max-w-lg">
				<div className="h-24 w-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 text-amber-500">
					<Construction className="h-12 w-12" />
				</div>
				<h1 className="text-4xl font-black text-slate-900 mb-4">
					{t("education")}
				</h1>
				<p className="text-lg text-slate-500 mb-8 font-medium">
					{t("comingSoon")}... We are currently building enterprise-grade AI
					infrastructure for the Education sector.
				</p>
				<Link href="/">
					<Button variant="outline" className="rounded-full font-bold">
						Return Home
					</Button>
				</Link>
			</div>
		</div>
	);
}
