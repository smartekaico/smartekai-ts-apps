import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Text,
	Section,
	Tailwind,
	Hr,
} from "@react-email/components";
import * as React from "react";

interface MagicLinkEmailProps {
	userEmail: string;
	url: string;
}

export const MagicLinkEmail = ({
	userEmail = "user@example.com",
	url = "https://smartekai.com/api/auth/magic-link?token=test",
}: MagicLinkEmailProps) => {
	return (
		<Html lang="ar" dir="rtl">
			<Head />
			<Preview>تسجيل دخول آمن - Secure Magic Link Login</Preview>
			<Tailwind>
				<Body className="bg-slate-50 font-sans text-slate-900 overflow-hidden py-10 px-4">
					<Container className="mx-auto max-w-[600px] bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
						{/* Header / Brand */}
						<Section className="bg-slate-900 p-10 text-center">
							<Heading className="text-3xl font-black tracking-tight text-white m-0">
								Smartek AI Hub
							</Heading>
							<Text className="text-indigo-400 font-bold uppercase tracking-widest text-[10px] mt-2">
								Unified Professional Intelligence
							</Text>
						</Section>

						{/* Content Area */}
						<Section className="p-10 pt-12 text-right" dir="rtl">
							<Heading className="text-2xl font-black text-slate-900 mb-6">
								تسجيل دخول آمن
							</Heading>

							<Text className="text-slate-600 text-lg leading-relaxed mb-8">
								مرحباً، لقد تلقينا طلباً لتسجيل الدخول إلى حسابك المرتبط بـ (<strong>{userEmail}</strong>) عبر الرابط السريع. انقر على الزر أدناه للدخول مباشرة.
							</Text>

							<Section className="text-center">
								<Link
									href={url}
									className="bg-indigo-600 block py-5 px-10 rounded-2xl text-white font-black text-xl text-center no-underline shadow-xl shadow-indigo-100 transition-all font-sans"
								>
									تسجيل الدخول (Login Now)
								</Link>
								<Text className="text-slate-400 text-sm mt-6 font-medium">
									هذا الرابط صالح لمدة 10 دقائق فقط ويمكن استخدامه لمرة واحدة.
								</Text>
							</Section>

							<Hr className="border-slate-100 my-10" />

							{/* English Version Support */}
							<Section className="text-left" dir="ltr">
								<Text className="text-slate-500 text-sm leading-relaxed">
									Hi, we received a request to log in to your account for{" "}
									<strong>{userEmail}</strong> via magic link. Click the button above to log in directly. This link is valid for 10 minutes.
								</Text>
							</Section>
						</Section>

						{/* Footer */}
						<Section className="bg-slate-50 p-8 border-t border-slate-100 text-center">
							<Text className="text-slate-400 text-xs font-medium m-0">
								&copy; 2026 Smartek AI - Smartek AI Hub Platform. All rights
								reserved.
							</Text>
						</Section>
					</Container>

					<Section className="mt-8 text-center">
						<Text className="text-slate-400 text-[11px] max-w-[400px] mx-auto leading-tight italic">
							هذا البريد مرسل آلياً من منصة Smartek AI Hub. إذا لم تطلب هذا البريد، يمكنك تجاهله بأمان.
						</Text>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default MagicLinkEmail;
