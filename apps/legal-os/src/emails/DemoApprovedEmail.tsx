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
	Row,
	Column,
} from "@react-email/components";
import * as React from "react";

import { getBaseUrl } from "@/lib/utils";

interface DemoApprovedEmailProps {
	name: string;
	token: string;
	industry: string;
	publicUrl?: string;
	magicLink?: string;
}

export const DemoApprovedEmail = ({
	name = "المستخدم",
	token = "TEST-TOKEN-123",
	industry = "LEGAL",
	publicUrl,
	magicLink,
}: DemoApprovedEmailProps) => {
	const isLegal = industry === "LEGAL";
	const accentColor = isLegal ? "#4F46E5" : "#10B981"; // Indigo for Legal, Emerald for Medical
	const baseUrl = publicUrl || getBaseUrl();

	return (
		<Html lang="ar" dir="rtl">
			<Head />
			<Preview>
				تم اعتماد طلبك - أهلاً بك في {isLegal ? "Legal OS" : "Medical OS"}
			</Preview>
			<Tailwind>
				<Body className="bg-white font-sans">
					<Container className="mx-auto py-8 px-4">
						<Section className="text-center mb-8">
							<Heading className="text-3xl font-black tracking-tight text-slate-900 m-0">
								Smartek AI Hub
							</Heading>
							<Text className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
								المنصة القانونية والطبية المتكاملة
							</Text>
						</Section>

						<Section className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 shadow-sm">
							<Heading className="text-2xl font-bold text-slate-900 mb-4 text-right">
								مرحباً {name}،
							</Heading>
							<Text className="text-slate-600 text-lg leading-relaxed text-right mb-6">
								يسعدنا إبلاغك بأنه قد تم اعتماد طلبك للانضمام إلى منصتنا. يمكنك
								الآن البدء في استخدام
								<span className="font-bold" style={{ color: accentColor }}>
									{" "}
									{isLegal ? "Legal OS" : "Medical OS"}{" "}
								</span>
								واستكشاف أدوات الذكاء الاصطناعي المخصصة لك.
							</Text>
							
							<Text className="text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm font-bold text-right mb-6">
								ملاحظة هامة: لا تحتاج إلى كلمة مرور حالياً. يرجى الضغط على زر "الدخول المباشر" أدناه للوصول إلى حسابك. يمكنك تعيين كلمة مرور لاحقاً من إعدادات الملف الشخصي.
							</Text>

							{!magicLink && (
								<Section className="bg-white rounded-2xl p-6 border border-slate-200 text-center mb-8">
									<Text className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">
										كود الدعوة الخاص بك (Invite Token)
									</Text>
									<Text className="font-mono text-3xl font-black tracking-[0.2em] text-slate-900 m-0">
										{token}
									</Text>
								</Section>
							)}

							<Section className="text-center">
								<Link
									href={magicLink || `${baseUrl}/invite?token=${token}`}
									style={{ backgroundColor: accentColor }}
									className="inline-block py-4 px-10 rounded-xl text-white font-bold text-lg no-underline shadow-lg"
								>
									{magicLink ? "الدخول إلى المنصة مباشرة" : "تفعيل حسابي الآن"}
								</Link>
							</Section>
						</Section>

						<Section className="mt-12 text-center text-slate-400 text-sm">

							<Text className="m-0">
								هذا البريد مرسل آلياً، يرجى عدم الرد عليه.
							</Text>
							<Row className="mt-4">
								<Column>
									<Link href="#" className="text-slate-400 underline mx-2">
										مركز المساعدة
									</Link>
								</Column>
								<Column>
									<Link href="#" className="text-slate-400 underline mx-2">
										الشروط والأحكام
									</Link>
								</Column>
							</Row>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default DemoApprovedEmail;
