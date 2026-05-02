import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
	console.log("Seeding database...");

	// 1. Jurisdictions
	console.log("Seeding jurisdictions...");
	const [kuwait] = await db
		.insert(schema.jurisdictions)
		.values({
			id: "juris_kw_01",
			code: "KW",
			nameAr: "دولة الكويت",
			nameEn: "Kuwait",
			isActive: true,
		})
		.onConflictDoNothing()
		.returning();

	const [global] = await db
		.insert(schema.jurisdictions)
		.values({
			id: "juris_global_01",
			code: "GL",
			nameAr: "عام (عالمي)",
			nameEn: "Global",
			isActive: true,
		})
		.onConflictDoNothing()
		.returning();

	const jurisId = kuwait?.id || "juris_kw_01";
	const globalId = global?.id || "juris_global_01";

	// 2. Case Categories
	console.log("Seeding case categories...");
	await db
		.insert(schema.caseCategories)
		.values([
			{
				id: "case_labor_01",
				slug: "labor",
				nameAr: "قضايا عمالية",
				nameEn: "Labor Cases",
				descriptionAr:
					"تحليل النزاعات العمالية، حقوق نهاية الخدمة، والفصل التعسفي.",
				jurisdictionId: jurisId,
				workspaceSlug: "legal-workspace",
				creditsCost: 3,
				icon: "👷",
				legalDomain: "Labor",
			},
			{
				id: "case_rent_01",
				slug: "rent",
				nameAr: "دعاوى إيجارات",
				nameEn: "Rent Cases",
				descriptionAr:
					"تحليل دعاوى الإخلاء والمطالبات المادية وبطلان عقود الإيجار.",
				jurisdictionId: jurisId,
				workspaceSlug: "legal-workspace",
				creditsCost: 2,
				icon: "🏠",
				legalDomain: "Property",
			},
			{
				id: "case_commercial_01",
				slug: "commercial",
				nameAr: "نزاعات تجارية",
				nameEn: "Commercial Cases",
				descriptionAr:
					"تحليل النزاعات التجارية المعقدة، دعاوى المطالبات المالية، والعقود بين الشركات.",
				jurisdictionId: jurisId,
				workspaceSlug: "legal-workspace",
				creditsCost: 4,
				icon: "💼",
				legalDomain: "Commercial",
			},
			{
				id: "case_procedure_01",
				slug: "procedures",
				nameAr: "اجراءات",
				nameEn: "Procedures",
				descriptionAr: "نصوص الإجراءات القانونية والمواعيد والمساطر القضائية.",
				jurisdictionId: jurisId,
				workspaceSlug: "legal-workspace",
				creditsCost: 2,
				icon: "⚖️",
				legalDomain: "Procedures",
			},
			// Global Categories
			{
				id: "case_labor_global",
				slug: "labor-global",
				nameAr: "قضايا عمالية (عالمي)",
				nameEn: "Labor Cases (Global)",
				descriptionAr: "تحليل النزاعات العمالية والعقود المهنية دولياً.",
				jurisdictionId: globalId,
				workspaceSlug: "global-workspace",
				creditsCost: 3,
				icon: "🌍",
				legalDomain: "Labor",
			},
			{
				id: "case_commercial_global",
				slug: "commercial-global",
				nameAr: "نزاعات تجارية (عالمي)",
				nameEn: "Commercial Cases (Global)",
				descriptionAr: "النزاعات التجارية الدولية وعقود الاستثمار.",
				jurisdictionId: globalId,
				workspaceSlug: "global-workspace",
				creditsCost: 4,
				icon: "🌐",
				legalDomain: "Commercial",
			},
		])
		.onConflictDoNothing();

	// 3. Contract Templates
	console.log("Seeding contract templates...");
	await db
		.insert(schema.contractTemplates)
		.values([
			{
				id: "contract_emp_01",
				slug: "employment-contract",
				nameAr: "عقد عمل قياسي",
				nameEn: "Standard Employment Contract",
				descriptionAr:
					"مسودة عقد عمل متكاملة لحماية حقوق الطرفين وتحديد الالتزامات الجوهرية.",
				jurisdictionId: globalId,
				category: "Labor",
				markdownTemplate:
					"# عقد عمل\n\nإنه في يوم...\nتم الاتفاق بين كل من:\n1. ... (الطرف الأول - الشركة)\n2. ... (الطرف الثاني - الموظف)\n\nعلى أن يعمل الطرف الثاني لدى الطرف الأول بمهنة...",
				variablesSchema: {
					companyName: "اسم الشركة (الطرف الأول)",
					employeeName: "اسم الموظف (الطرف الثاني)",
					salary: "الراتب الأساسي",
					jobTitle: "المسمى الوظيفي",
				},
				creditsCost: 2,
			},
			{
				id: "contract_lease_01",
				slug: "lease-agreement",
				nameAr: "عقد إيجار قياسي",
				nameEn: "Standard Lease Agreement",
				descriptionAr:
					"عقد إيجار مفصل للاستخدام السكني أو التجاري يغطي كافة الجوانب القانونية.",
				jurisdictionId: globalId,
				category: "Property",
				markdownTemplate:
					"# عقد إيجار\n\nإنه في يوم...\n\nاتفق المؤجر... والمستأجر... على استئجار العين الكائنة في...",
				variablesSchema: {
					landlordName: "اسم المؤجر",
					tenantName: "اسم المستأجر",
					rentAmount: "القيمة الإيجارية الشهرية",
					propertyDetails: "وصف وحجم العين المؤجرة",
				},
				creditsCost: 2,
			},
		])
		.onConflictDoNothing();

	console.log("Data seeding completed successfully!");
}

main().catch((err) => {
	console.error("Seeding failed:");
	console.error(err);
	process.exit(1);
});
