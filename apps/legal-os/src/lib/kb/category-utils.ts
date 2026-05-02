export interface Category {
	id: string;
	nameAr: string | null;
	nameEn: string | null;
	slug?: string;
}

const CATEGORY_MAP: Record<string, { ar: string; en: string }> = {
	case_procedure_01: { ar: "إجراءات التقاضي", en: "Litigation Procedures" },
	penal_financial: { ar: "قضايا الأموال", en: "Financial Crimes" },
	penal_cyber: { ar: "الجرائم الإلكترونية", en: "Cyber Crimes" },
	penal_narcotics: { ar: "قضايا المخدرات", en: "Narcotics Crimes" },
	penal_murder: { ar: "جرائم القتل", en: "Murder Crimes" },
	legal_drafting: { ar: "صياغة قانونية", en: "Legal Drafting" },
	contract_review: { ar: "مراجعة العقود", en: "Contract Review" },
	penal_persons: { ar: "جنح ضد الأشخاص", en: "Misdemeanors vs Persons" },
	real_estate: { ar: "عقاري", en: "Real Estate" },
	traffic: { ar: "مرور", en: "Traffic" },
	penal_property_trust: {
		ar: "إتلاف ممتلكات وخيانة أمانة",
		en: "Property Damage & Breach of Trust",
	},
	bounced_checks: { ar: "شيكات بدون رصيد", en: "Bounced Checks" },
	family_law: { ar: "أحوال شخصية", en: "Family Law" },
	PROCEDURES: { ar: "إجراءات", en: "Procedures" },
	CIVIL: { ar: "مدني", en: "Civil" },
	CIVIL_CASE: { ar: "قضية مدنية", en: "Civil Case" },
	COMMERCIAL: { ar: "تجاري", en: "Commercial" },
	COMMERCIAL_CASE: { ar: "قضية تجارية", en: "Commercial Case" },
	LABOR: { ar: "عمالي", en: "Labor" },
	LABOR_CASE: { ar: "قضية عمالية", en: "Labor Case" },
	RENT: { ar: "إيجارات", en: "Rent" },
	PERSONAL_STATUS: { ar: "أحوال شخصية", en: "Personal Status" },
	PERSONAL_CASE: { ar: "قضية أحوال شخصية", en: "Personal Case" },
	CRIMINAL: { ar: "جنائي", en: "Criminal" },
	CRIMINAL_CASE: { ar: "قضية جنائية", en: "Criminal Case" },
	ADMINISTRATIVE: { ar: "إداري", en: "Administrative" },
	ADMINISTRATIVE_CASE: { ar: "قضية إدارية", en: "Administrative Case" },
	GENERAL: { ar: "عام", en: "General" },
	عام: { ar: "عام", en: "General" },
};

/**
 * Returns a localized name for a category, handling variable names and fallbacks.
 */
export function getLocalizedCategoryName(
	cat: Category,
	locale: string,
): string {
	const isAr = locale === "ar";

	// 1. Try to find if the raw name matches our known variable map (case-insensitive)
	const nameEnRaw = cat.nameEn || "";
	const nameArRaw = cat.nameAr || "";
	const slugRaw = cat.slug || "";

	for (const [key, mapping] of Object.entries(CATEGORY_MAP)) {
		if (
			nameEnRaw.toUpperCase() === key.toUpperCase() ||
			nameArRaw.toUpperCase() === key.toUpperCase() ||
			slugRaw.toUpperCase() === key.toUpperCase()
		) {
			return isAr ? mapping.ar : mapping.en;
		}
	}

	// 2. Standard fallback logic if not in map
	const preferred = isAr ? cat.nameAr : cat.nameEn;
	const secondary = isAr ? cat.nameEn : cat.nameAr;

	const final = preferred || secondary || (isAr ? "غير مصنفة" : "Uncategorized");

	// If the result still looks like a variable (underscores/all caps), prettify it
	if (
		final.includes("_") ||
		(final === final.toUpperCase() && final.length > 3)
	) {
		return final
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");
	}

	return final;
}
