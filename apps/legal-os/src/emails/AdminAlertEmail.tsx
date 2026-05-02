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
	Row,
	Column,
	Tailwind,
} from "@react-email/components";
import * as React from "react";

interface AdminAlertEmailProps {
	name: string;
	email: string;
	industry: string;
	company: string | null;
}

export const AdminAlertEmail = ({
	name = "المستخدم",
	email = "user@example.com",
	industry = "LEGAL",
	company = "Independent",
}: AdminAlertEmailProps) => {
	return (
		<Html lang="en">
			<Head />
			<Preview>New Demo Request Received - {name}</Preview>
			<Tailwind>
				<Body className="bg-slate-900 font-sans text-white">
					<Container className="mx-auto py-12 px-4 max-w-[600px]">
						<Section className="mb-8">
							<Heading className="text-2xl font-black tracking-tight text-white m-0">
								Smartek AI Hub Admin Alert
							</Heading>
							<Text className="text-slate-400 font-medium uppercase tracking-widest text-[10px] mt-1">
								New Platform Inbound Request
							</Text>
						</Section>

						<Section className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-xl">
							<Heading className="text-xl font-bold text-white mb-6">
								Demo Request Details
							</Heading>

							<Section className="space-y-4 mb-8">
								<Row className="mb-4">
									<Column className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">
										Name
									</Column>
									<Column className="text-white font-bold">{name}</Column>
								</Row>
								<Row className="mb-4">
									<Column className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">
										Email
									</Column>
									<Column className="text-white font-bold underline">
										{email}
									</Column>
								</Row>
								<Row className="mb-4">
									<Column className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">
										Industry
									</Column>
									<Column className="text-indigo-400 font-black">
										{industry}
									</Column>
								</Row>
								<Row className="mb-4">
									<Column className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">
										Company
									</Column>
									<Column className="text-white font-medium">
										{company || "باحث مستقل"}
									</Column>
								</Row>
							</Section>

							<Section className="text-center pt-8 border-t border-slate-700">
								<Link
									href={`${process.env.NEXT_PUBLIC_APP_URL || "https://admin.example.com"}/dashboard/admin`}
									className="bg-indigo-600 block py-4 rounded-xl text-white font-bold text-center no-underline transition-colors"
								>
									Review Request in Dashboard
								</Link>
							</Section>
						</Section>

						<Text className="text-center mt-8 text-slate-500 text-xs font-medium italic opacity-60">
							System generated alert for Smartek AI Hub Administrators.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default AdminAlertEmail;
