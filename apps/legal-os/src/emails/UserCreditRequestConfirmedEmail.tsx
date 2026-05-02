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
} from "@react-email/components";
import * as React from "react";

interface UserCreditRequestConfirmedEmailProps {
	name: string;
	orgName: string;
	paymentUrl: string;
	packageName: string;
	credits: number;
}

export const UserCreditRequestConfirmedEmail = ({
	name = "المستخدم",
	orgName = "Organization",
	paymentUrl = "https://payment.smarteka.com/pay-manual",
	packageName = "الباقة الأساسية",
	credits = 50,
}: UserCreditRequestConfirmedEmailProps) => {
	return (
		<Html lang="ar" dir="rtl">
			<Head />
			<Preview>تم استلام طلب شحن الرصيد بنجاح - المساعد القانوني</Preview>
			<Tailwind>
				<Body className="bg-slate-900 font-sans text-white text-right">
					<Container className="mx-auto py-12 px-4 max-w-[600px]">
						<Section className="mb-8">
							<Heading className="text-2xl font-black tracking-tight text-white m-0">
								المساعد القانوني الذكي
							</Heading>
							<Text className="text-indigo-400 font-medium uppercase tracking-widest text-[10px] mt-1">
								تأكيد استلام طلب الشحن اليدوي
							</Text>
						</Section>

						<Section className="bg-white rounded-[2.5rem] p-10 text-slate-900 shadow-2xl relative overflow-hidden">
							<div className="absolute top-0 right-0 w-2 h-full bg-indigo-600" />

							<Heading className="text-2xl font-black text-slate-900 mb-6">
								مرحباً {name}،
							</Heading>

							<Text className="text-slate-600 font-medium text-lg leading-relaxed mb-8 text-right">
								لقد استلمنا طلبكم لشحن **{packageName}** (رصيد {credits} نقطة)
								لمكتب **{orgName}**. يمكنكم الآن إكمال عملية الدفع عبر الرابط
								الآمن أدناه لتفعيل الرصيد بشكل فوري.
							</Text>

							<Section className="bg-slate-50 border border-slate-100 p-8 rounded-[1.5rem] mb-10 text-center">
								<Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
									خطوات التفعيل
								</Text>
								<Text className="text-slate-700 font-bold text-sm mb-6 leading-relaxed">
									1. اضغط على رابط الدفع بالأسفل
									<br />
									2. أكمل العملية بوسائل الدفع المحلية
									<br />
									3. سيتم تفعيل الرصيد آلياً لهذه الباقة
								</Text>

								<Link
									href={`${paymentUrl}?org=${encodeURIComponent(orgName)}`}
									className="bg-indigo-600 block py-5 rounded-2xl text-white font-black text-center no-underline transition-all shadow-xl shadow-indigo-100"
								>
									ادفع الآن (Pay Now)
								</Link>
							</Section>

							<Text className="text-slate-400 text-sm font-bold italic leading-relaxed">
								في حال وجود أي استفسار، يرجى الرد على هذا البريد مباشرة للتواصل
								مع فريق الدعم الفني.
							</Text>
						</Section>

						<Text className="text-center mt-8 text-slate-500 text-xs font-medium opacity-60">
							تم إرسال هذا البريد آلياً من منصة المساعد القانوني الذكي.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default UserCreditRequestConfirmedEmail;
