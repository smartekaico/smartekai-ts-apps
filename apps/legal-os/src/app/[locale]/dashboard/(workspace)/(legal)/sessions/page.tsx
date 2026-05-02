import { redirect } from "next/navigation";

export default async function SessionsManagementPage(props: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await props.params;
	redirect(`/${locale}/dashboard/history?tab=sessions`);
	return null;
}
