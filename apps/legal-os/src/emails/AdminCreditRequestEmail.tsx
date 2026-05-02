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

interface AdminCreditRequestEmailProps {
	name: string;
	email: string;
	orgName: string;
	currentBalance: number;
	packageName: string;
	requestedCredits: number;
}

export const AdminCreditRequestEmail = ({
	name = "المستخدم",
	email = "user@example.com",
	orgName = "Organization",
	currentBalance = 0,
	packageName = "Lite Package",
	requestedCredits = 50,
}: AdminCreditRequestEmailProps) => {
	return (
		<Html lang="en">
			<Head />
			<Preview>
				Credit Top-up Request: {orgName} - {name}
			</Preview>
			<Tailwind>
				<Body className="bg-slate-900 font-sans text-white">
					<Container className="mx-auto py-12 px-4 max-w-[600px]">
						<Section className="mb-8">
							<Heading className="text-2xl font-black tracking-tight text-white m-0">
								Smartek AI Hub Admin Alert
							</Heading>
							<Text className="text-slate-400 font-medium uppercase tracking-widest text-[10px] mt-1">
								New Manual Credit Top-up Request
							</Text>
						</Section>

						<Section className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-xl">
							<Heading className="text-xl font-bold text-white mb-6">
								Request Details
							</Heading>

							<Section className="space-y-4 mb-8">
								<Row className="mb-4">
									<Column className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">
										User
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
										Package
									</Column>
									<Column className="text-white font-black">
										{packageName} ({requestedCredits} Units)
									</Column>
								</Row>
								<Row className="mb-4">
									<Column className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">
										Organization
									</Column>
									<Column className="text-indigo-400 font-extrabold">
										{orgName}
									</Column>
								</Row>
								<Row className="mb-4">
									<Column className="w-24 text-slate-400 text-xs font-bold uppercase tracking-wider">
										Current Bal
									</Column>
									<Column className="text-white font-medium">
										{currentBalance} Points
									</Column>
								</Row>
							</Section>

							<Section className="text-center pt-8 border-t border-slate-700">
								<Link
									href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/admin/legal/subscribers`}
									className="bg-indigo-600 block py-4 rounded-xl text-white font-bold text-center no-underline transition-colors"
								>
									Manage Credits in Admin Hub
								</Link>
							</Section>
						</Section>

						<Text className="text-center mt-8 text-slate-500 text-xs font-medium italic opacity-60">
							System generated alert for Smartek AI Hub Administrators regarding
							manual billing.
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
};

export default AdminCreditRequestEmail;
