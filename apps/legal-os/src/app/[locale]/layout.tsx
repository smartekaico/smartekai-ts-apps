import { useMessages, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Geist, Geist_Mono, Noto_Naskh_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import { CSPostHogProvider } from "@/components/providers/PostHogProvider";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
	icons: {
		icon: [
			{ url: "/logo-icon.svg", type: "image/svg+xml" },
		],
		apple: "/logo-icon.png",
	},
};

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const notoNaskh = Noto_Naskh_Arabic({
	variable: "--font-naskh",
	subsets: ["arabic"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
});

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
		notFound();
	}

	// Enable static rendering
	setRequestLocale(locale);

	const messages = await getMessages();
	const direction = locale === "ar" ? "rtl" : "ltr";

	return (
		<html
			lang={locale}
			dir={direction}
			className={`${geistSans.variable} ${geistMono.variable} ${notoNaskh.variable} h-full antialiased`}
			suppressHydrationWarning
		>
			<body
				className="min-h-full flex flex-col font-sans"
				suppressHydrationWarning
			>
				<NextIntlClientProvider messages={messages} locale={locale}>
					<CSPostHogProvider>{children}</CSPostHogProvider>
					<Toaster
						position="top-center"
						dir={direction}
						toastOptions={{
							style: {
								fontFamily:
									locale === "ar"
										? "var(--font-naskh), 'Noto Naskh Arabic', serif"
										: "var(--font-geist-sans), sans-serif",
								direction: direction,
							},
						}}
					/>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
