import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { setRequestLocale } from "next-intl/server";

export default async function MarketingLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	return (
		<>
			<MarketingHeader />
			<main className="min-h-screen bg-white flex flex-col">{children}</main>
			<MarketingFooter />
		</>
	);
}
