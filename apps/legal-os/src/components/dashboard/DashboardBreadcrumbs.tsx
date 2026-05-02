"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

export function DashboardBreadcrumbs() {
	const pathname = usePathname();
	const t = useTranslations("Breadcrumbs");

	// Example path: /ar/dashboard/settings/profile
	const segments = pathname.split("/").filter(Boolean);
	const locale = segments[0]; // ar or en

	// Find the index of "dashboard"
	const dashboardIndex = segments.indexOf("dashboard");

	// Get segments after /dashboard
	const pathSegments =
		dashboardIndex !== -1 ? segments.slice(dashboardIndex + 1) : [];

	return (
		<Breadcrumb className="mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link
							href={`/${locale}/dashboard`}
							className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
						>
							<Home className="h-3.5 w-3.5" />
							<span className="sr-only font-bold">{t("dashboard")}</span>
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>

				{pathSegments.map((segment, index) => {
					// Skip numeric IDs (like session IDs)
					const isNumeric = /^\d+$/.test(segment);
					const isUuid =
						/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
							segment,
						);

					if (isNumeric || isUuid) return null;

					const isLast = index === pathSegments.length - 1;
					const href = `/${locale}/dashboard/${pathSegments.slice(0, index + 1).join("/")}`;

					// Try to translate segment, fallback to capitalized segment
					let label = segment;
					try {
						// Check if translation exists for this segment
						const translated = t(segment as any);
						if (translated && translated !== segment) {
							label = translated;
						} else {
							label = segment.charAt(0).toUpperCase() + segment.slice(1);
						}
					} catch (e) {
						label = segment.charAt(0).toUpperCase() + segment.slice(1);
					}

					return (
						<React.Fragment key={segment}>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage className="font-black text-slate-900">
										{label}
									</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild>
										<Link
											href={href}
											className="hover:text-indigo-600 transition-colors font-bold uppercase tracking-wider text-[12px]"
										>
											{label}
										</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
						</React.Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
