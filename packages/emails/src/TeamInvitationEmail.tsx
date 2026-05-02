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

interface TeamInvitationEmailProps {
	inviterName: string;
	inviterEmail: string;
	orgName: string;
	inviteLink: string;
}

export const TeamInvitationEmail = ({
	inviterName = "أدمن المنصة",
	inviterEmail = "admin@smartekai.com",
	orgName = "مكتب المحاماة الذكي",
	inviteLink = "https://hubos.ai/accept-invite",
}: TeamInvitationEmailProps) => {
	return (
		<Html lang="ar" dir="rtl">
			<Head />
			<Preview>
				دعوة للانضمام إلى {orgName} - Join {orgName} on Smartek AI Hub
			</Preview>
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
								دعوة للانضمام إلى الفريق
							</Heading>

							<Text className="text-slate-600 text-lg leading-relaxed mb-8">
								مرحباً بك! لقد قام <strong>{inviterName}</strong> ({inviterEmail}
								) بدعوتك للانضمام إلى فريق العمل في <strong>{orgName}</strong>{" "}
								على منصة المساعد الذكي.
							</Text>

							<Section className="bg-slate-50 rounded-3xl p-8 border border-slate-100 mb-10">
								<Text className="text-slate-500 font-bold text-sm mb-4 uppercase tracking-wider">
									مزايا الانضمام (Benefits):
								</Text>
								<ul className="text-slate-700 space-y-3 m-0 p-0 list-none font-medium">
									<li className="flex items-center gap-3">
										<span className="text-indigo-600">✦</span> الوصول المشترك
										للقضايا والمشاريع.
									</li>
									<li className="flex items-center gap-3">
										<span className="text-indigo-600">✦</span> استخدام رصيد
										المكتب الموحد للذكاء الاصطناعي.
									</li>
									<li className="flex items-center gap-3">
										<span className="text-indigo-600">✦</span> التعاون اللحظي
										على صياغة المذكرات والمستندات.
									</li>
								</ul>
							</Section>

							<Section className="text-center">
								<Link
									href={inviteLink}
									className="bg-indigo-600 block py-5 px-10 rounded-2xl text-white font-black text-xl text-center no-underline shadow-xl shadow-indigo-100 transition-all"
								>
									قبول الدعوة والانضمام (Accept Invite)
								</Link>
								<Text className="text-slate-400 text-sm mt-6 font-medium">
									ستنتهي صلاحية هذه الدعوة تلقائياً خلال 48 ساعة.
								</Text>
							</Section>

							<Hr className="border-slate-100 my-10" />

							{/* English Version Support */}
							<Section className="text-left" dir="ltr">
								<Text className="text-slate-500 text-sm leading-relaxed">
									You have been invited by <strong>{inviterName}</strong> to
									join <strong>{orgName}</strong> on Smartek AI Hub. Collaborate
									on legal/medical cases, share AI credits, and manage firm
									workflows seamlessly.
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
							هذا البريد مرسل آلياً من منصة Smartek AI Hub. إذا لم تكن تتوقع هذه
							الدعوة، يرجى تجاهلها.
						</Text>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default TeamInvitationEmail;
