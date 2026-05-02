import { SettingsTabs } from "@/components/dashboard/settings/SettingsTabs";

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col h-full w-full bg-white rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-sm border border-slate-100 animate-in fade-in duration-1000">
			<SettingsTabs />
			<main className="flex-1 overflow-y-auto bg-white">
				<div className="max-w-6xl mx-auto px-6 py-10 md:px-12 md:py-12">
					{children}
				</div>
			</main>
		</div>
	);
}
