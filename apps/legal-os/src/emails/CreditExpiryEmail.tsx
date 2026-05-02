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

interface CreditExpiryEmailProps {
	orgName: string;
	amount: number;
	expiryDate: string;
	billingLink: string;
}

export const CreditExpiryEmail = ({
	orgName = "مكتب المحاماة",
	amount = 100,
	expiryDate = "2024-12-31",
	billingLink = "https://hubos.ai/dashboard/billing",
}: CreditExpiryEmailProps) => {
	return (
		<Html lang="ar" dir="rtl">
			<Head />
			<Preview>{`تنبيه: ستنتهي صلاحية ${amount} نقطة قريباً - Credits Expiring Soon`}</Preview>
			<Tailwind>
				<Body className="bg-slate-50 font-sans text-slate-900 py-10 px-4">
					<Container className="mx-auto max-w-[600px] bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
						{/* Header */}
						<Section className="bg-rose-600 p-10 text-center">
							<Heading className="text-3xl font-black tracking-tight text-white m-0 tracking-tighter">
								Smartek AI Hub Credits
							</Heading>
							<Text className="text-rose-100 font-bold uppercase tracking-widest text-[10px] mt-2">
								Unified Professional Intelligence
							</Text>
						</Section>

						{/* Content Area */}
						<Section className="p-10 pt-12 text-right" dir="rtl">
							<Heading className="text-2xl font-black text-slate-900 mb-6 tracking-tight">
								تنبيه بانتهاء صلاحية النقاط
							</Heading>

							<Text className="text-slate-600 text-lg leading-relaxed mb-8">
								نود إحاطتكم علماً بأن <strong>{amount} نقطة</strong> من رصيد
								المكتب في <strong>{orgName}</strong> ستنتهي صلاحيتها خلال 7
								أيام، وتحديداً في تاريخ <strong>{expiryDate}</strong>.
							</Text>

							<Section className="bg-rose-50 rounded-3xl p-8 border border-rose-100 mb-10">
								<Text className="text-rose-700 font-bold text-sm mb-4 uppercase tracking-wider">
									تفاصيل التنبيه (Alert Details):
								</Text>
								<Text className="text-slate-700 font-medium m-0 leading-relaxed text-lg">
									لضمان عدم فقدان هذه النقاط، يرجى استخدامها في عمليات التحليل
									أو البحث أو الصياغة القانونية قبل تاريخ الانتهاء الموضح.
								</Text>
							</Section>

							<Section className="text-center">
								<Link
									href={billingLink}
									className="bg-slate-900 block py-5 px-10 rounded-2xl text-white font-black text-xl text-center no-underline shadow-xl shadow-slate-100 transition-all font-sans"
								>
									إدارة الرصيد (Manage Credits)
								</Link>
							</Section>

							<Hr className="border-slate-100 my-10" />

							{/* English Version Support */}
							<Section className="text-left" dir="ltr">
								<Text className="text-slate-500 text-sm leading-relaxed">
									Notice: <strong>{amount} credits</strong> for{" "}
									<strong>{orgName}</strong> are set to expire on{" "}
									<strong>{expiryDate}</strong> (in 7 days). Please utilize them
									in any of our AI-powered legal tools before they are cleared
									from your account to ensure maximum efficiency.
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
							هذا التذكير مرسل آلياً كجزء من سياسة الاستخدام في منصة Smartek AI
							Hub.
						</Text>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default CreditExpiryEmail;
