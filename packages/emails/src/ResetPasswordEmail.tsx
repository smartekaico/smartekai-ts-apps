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

interface ResetPasswordEmailProps {
	userEmail: string;
	resetLink: string;
}

export const ResetPasswordEmail = ({
	userEmail = "user@example.com",
	resetLink = "https://smartekai.com/reset-password?token=test-token",
}: ResetPasswordEmailProps) => {
	return (
		<Html lang="ar" dir="rtl">
			<Head />
			<Preview>استعادة كلمة المرور - Reset Your Password</Preview>
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
								استعادة كلمة المرور
							</Heading>

							<Text className="text-slate-600 text-lg leading-relaxed mb-8">
								مرحباً، لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك
								المرتبط بـ (<strong>{userEmail}</strong>). إذا لم تقم بهذا
								الطلب، يرجى تجاهل هذا البريد.
							</Text>

							<Section className="text-center">
								<Link
									href={resetLink}
									className="bg-indigo-600 block py-5 px-10 rounded-2xl text-white font-black text-xl text-center no-underline shadow-xl shadow-indigo-100 transition-all font-sans"
								>
									تعيين كلمة مرور جديدة
								</Link>
								<Text className="text-slate-400 text-sm mt-6 font-medium">
									هذا الرابط صالح لمدة ساعة واحدة فقط.
								</Text>
							</Section>

							<Hr className="border-slate-100 my-10" />

							{/* English Version Support */}
							<Section className="text-left" dir="ltr">
								<Text className="text-slate-500 text-sm leading-relaxed">
									Hi, we received a request to reset your password for{" "}
									<strong>{userEmail}</strong>. If you didn&apos;t make this
									request, please ignore this email. This link is valid for 1
									hour.
								</Text>
								<Link
									href={resetLink}
									className="text-indigo-600 font-bold text-sm underline"
								>
									Reset Password (Internal Link)
								</Link>
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
							هذا البريد مرسل آلياً من منصة Smartek AI Hub. لحمايتك، لا تشارك هذا
							الرابط مع أي شخص.
						</Text>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default ResetPasswordEmail;
