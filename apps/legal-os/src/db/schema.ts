import {
	pgTable,
	text,
	timestamp,
	boolean,
	integer,
	jsonb,
	customType,
	index,
	serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Schema Touch: 2026-04-11 (Resolving HMR ghosts)
const vector = customType<{ data: number[] }>({
	dataType() {
		return "vector(768)"; // Updated to 768 for Gemini Embedding 2
	},
	toDriver(value: number[]): string {
		return `[${value.join(",")}]`; // Explicit bracket format for pgvector
	},
});

export const users = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	firmName: text("firm_name"),
	subscriptionTier: text("subscription_tier").default("free").notNull(),
	creditBalance: integer("credit_balance").default(0).notNull(), // Deprecated
	firmBranding: text("firm_branding"),
	activeOrganizationId: text("active_organization_id"),
	industryRole: text("industry_role").default("LEGAL").notNull(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const organizations = pgTable("organization", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	slug: text("slug").unique(),
	logo: text("logo"),
	createdAt: timestamp("created_at").notNull(),
	metadata: text("metadata"),
	industry: text("industry").default("MIXED").notNull(),
	creditBalance: integer("credit_balance").default(50).notNull(),
	defaultJurisdiction: text("default_jurisdiction").default("kuwait").notNull(),
});

export const members = pgTable("member", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organizations.id),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	role: text("role").notNull(),
	createdAt: timestamp("created_at").notNull(),
});

export const invitations = pgTable("invitation", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organizations.id),
	email: text("email").notNull(),
	role: text("role").notNull(),
	status: text("status").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	inviterId: text("inviter_id")
		.notNull()
		.references(() => users.id),
});

export const sessions = pgTable("session", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	token: text("token").notNull().unique(),
	expiresAt: timestamp("expires_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	activeOrganizationId: text("active_organization_id"),
	industryRole: text("industry_role"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const accounts = pgTable("account", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	// Pre-1.x column, superseded by accessTokenExpiresAt; kept until data is checked.
	expiresAt: timestamp("expires_at"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
});

export const jurisdictions = pgTable("kb_jurisdictions", {
	id: text("id").primaryKey(),
	code: text("code").notNull(),
	nameAr: text("name_ar").notNull(),
	nameEn: text("name_en").notNull(),
	metadata: text("metadata"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const caseCategories = pgTable("kb_categories", {
	id: text("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	nameAr: text("name_ar").notNull(),
	nameEn: text("name_en").notNull(),
	descriptionAr: text("description_ar").notNull(),
	jurisdictionId: text("jurisdiction_id")
		.notNull()
		.references(() => jurisdictions.id),
	workspaceSlug: text("workspace_slug").notNull(),
	creditsCost: integer("credits_cost").notNull().default(3),
	icon: text("icon"),
	industry: text("industry").notNull().default("LEGAL"),
	legalDomain: text("legal_domain").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const caseAnalyses = pgTable("case_analyses", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	organizationId: text("organization_id").references(() => organizations.id),
	caseCategoryId: text("case_category_id")
		.notNull()
		.references(() => caseCategories.id),
	jurisdictionId: text("jurisdiction_id")
		.notNull()
		.references(() => jurisdictions.id),
	caseTitleAr: text("case_title_ar").notNull(),
	rawInputText: text("raw_input_text").notNull(),
	conversationId: text("conversation_id"),
	clarificationTurns: jsonb("clarification_turns"),
	clarificationCount: integer("clarification_count").default(0).notNull(),
	finalAnalysisText: text("final_analysis_text"),
	finalDraftText: text("final_draft_text"),
	status: text("status").default("draft").notNull(),
	creditsConsumed: integer("credits_consumed").default(0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	organizationId: text("organization_id").references(() => organizations.id),
	fullName: text("full_name").notNull(),
	phone: text("phone"),
	civilId: text("civil_id"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cases = pgTable("cases", {
	id: serial("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organizations.id),
	clientId: text("client_id")
		.notNull()
		.references(() => clients.id),
	title: text("title").notNull(),
	caseNumber: text("case_number"),
	plaintiff: text("plaintiff"),
	defendant: text("defendant"),
	status: text("status").default("Active").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workSessions = pgTable("work_sessions", {
	id: serial("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organizations.id),
	caseId: integer("case_id").references(() => cases.id),
	title: text("title").default("جلسة عمل جديدة"), // "New Working Session"
	tag: text("tag").default("عام"), // e.g. Civil, Criminal, General
	categoryId: text("category_id").references(() => caseCategories.id),
	status: text("status").default("Open").notNull(),
	isFavorite: boolean("is_favorite").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	deletedAt: timestamp("deleted_at"),
});

export const sessionChats = pgTable("session_chats", {
	id: serial("id").primaryKey(),
	sessionId: integer("session_id")
		.references(() => workSessions.id)
		.notNull(),
	role: text("role").notNull(), // 'user' or 'assistant'
	content: text("content").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const sessionDocs = pgTable("session_docs", {
	id: serial("id").primaryKey(),
	sessionId: integer("session_id")
		.references(() => workSessions.id)
		.notNull(),
	title: text("title").notNull(),
	content: text("content").notNull(), // TipTap HTML
	docType: text("doc_type").default("Draft").notNull(),
	categoryId: text("category_id").references(() => caseCategories.id),
	embedding: vector("embedding"), // Gemini 2 embedding for Hybrid Search
	status: text("status").default("Open").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
	deletedAt: timestamp("deleted_at"),
});

export const sessionEvents = pgTable("session_events", {
	id: serial("id").primaryKey(),
	sessionId: integer("session_id")
		.references(() => workSessions.id)
		.notNull(),
	title: text("title").notNull(),
	eventType: text("event_type").default("Deadline").notNull(), // 'Hearing', 'Expert', 'Deadline', 'Meeting'
	eventDate: timestamp("event_date").notNull(),
	court: text("court"), // المحكمة
	circuit: text("circuit"), // الدائرة
	rollNumber: text("roll_number"), // رقم الرول / القاعة
	description: text("description"), // الوصف / المطلوب
	assignedUserId: text("assigned_to").references(() => users.id),
	reminderEnabled: boolean("reminder_enabled").default(false).notNull(),
	reminderDays: integer("reminder_days").default(1), // Days before to remind
	status: text("status").default("Upcoming").notNull(), // 'Upcoming', 'Completed'
	createdAt: timestamp("created_at").defaultNow(),
	deletedAt: timestamp("deleted_at"),
});

export const contractTemplates = pgTable("contract_templates", {
	id: text("id").primaryKey(),
	slug: text("slug").notNull().unique(),
	nameAr: text("name_ar").notNull(),
	nameEn: text("name_en").notNull(),
	descriptionAr: text("description_ar").notNull(),
	jurisdictionId: text("jurisdiction_id")
		.notNull()
		.references(() => jurisdictions.id),
	category: text("category").notNull(),
	markdownTemplate: text("markdown_template").notNull(),
	variablesSchema: jsonb("variables_schema").notNull(),
	creditsCost: integer("credits_cost").notNull().default(2),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedContracts = pgTable("generated_contracts", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	organizationId: text("organization_id").references(() => organizations.id),
	templateId: text("template_id")
		.notNull()
		.references(() => contractTemplates.id),
	filledVariables: jsonb("filled_variables").notNull(),
	finalContractText: text("final_contract_text"),
	aiReviewNotes: text("ai_review_notes"),
	aiReviewPassed: boolean("ai_review_passed"),
	status: text("status").default("draft").notNull(),
	creditsConsumed: integer("credits_consumed").default(0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeBase = pgTable(
	"kb_documents",
	{
		id: serial("id").primaryKey(),
		organizationId: text("organization_id").references(() => organizations.id),
		jurisdiction: text("jurisdiction").notNull(),
		categoryId: text("category_id"),
		docType: text("doc_type").notNull(),
		title: text("title").notNull(),
		titleEn: text("title_en"),
		slug: text("slug").notNull().unique(),
		sourceRef: text("source_ref"),
		sourceUrl: text("source_url"),
		language: text("language").default("ar").notNull(),
		version: text("version"),
		rawMarkdown: text("raw_markdown").notNull(),
		frontmatter: jsonb("frontmatter"),
		fileHash: text("file_hash").notNull(),
		status: text("status").default("active").notNull(),
		uploadedBy: text("uploaded_by").default("system").notNull(),
		industry: text("industry").notNull().default("LEGAL"),
		tags: jsonb("tags").default([]).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => {
		return {
			orgIdx: index("kb_org_idx").on(table.organizationId),
		};
	},
);

export const kbChunks = pgTable("kb_chunks", {
	id: serial("id").primaryKey(),
	documentId: integer("document_id")
		.notNull()
		.references(() => knowledgeBase.id),
	chunkIndex: integer("chunk_index").notNull(),
	chunkId: text("chunk_id").notNull(),
	headingPath: text("heading_path"),
	headingLevel: integer("heading_level"),
	contentMd: text("content_md").notNull(),
	contentText: text("content_text").notNull(),
	contentTsv: customType({
		dataType() {
			return "tsvector";
		},
	})("content_tsv"),
	tokensEst: integer("tokens_est").notNull(),
	embedding: vector("embedding"),
	industry: text("industry").notNull().default("LEGAL"),
	citationLabel: text("citation_label"),
	metadata: jsonb("metadata"),
});

export const kbUploadLog = pgTable("kb_upload_log", {
	id: serial("id").primaryKey(),
	documentId: integer("document_id"),
	action: text("action").notNull(), // 'create', 'update', 'reindex', 'delete'
	status: text("status").notNull(), // 'success', 'error'
	chunksCount: integer("chunks_count").default(0),
	durationMs: integer("duration_ms"),
	uploadedBy: text("uploaded_by"),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at").defaultNow(),
});

// Define existing raw SQL table to protect it
export const savedDocuments = pgTable("saved_documents", {
	id: text("id").primaryKey(),
	userId: text("user_id").references(() => users.id),
	organizationId: text("organization_id").references(() => organizations.id),
	title: text("title"),
	content: text("content"),
	docType: text("doc_type"),
	categoryId: text("category_id").references(() => caseCategories.id),
	status: text("status").default("Open").notNull(),
	sourceText: text("source_text"),
	createdAt: timestamp("created_at").defaultNow(),
	updatedAt: timestamp("updated_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	organizationId: text("organization_id").references(() => organizations.id),
	caseId: text("case_id").references(() => caseAnalyses.id),
	title: text("title").notNull(),
	appointmentDate: timestamp("appointment_date").notNull(),
	reminderDate: timestamp("reminder_date").notNull(),
	status: text("status").default("upcoming").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ledgers = pgTable("ledgers", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	organizationId: text("organization_id").references(() => organizations.id),
	amount: integer("amount").notNull(),
	description: text("description").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id),
	organizationId: text("organization_id").references(() => organizations.id),
	action: text("action").notNull(), // 'DRAFTING', 'ANALYSIS', 'RESEARCH', 'BILLING', 'TEAM_INVITE'
	details: text("details"), // JSON or string of action context
	creditsSpent: integer("credits_spent").default(0).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id],
	}),
	organization: one(organizations, {
		fields: [auditLogs.organizationId],
		references: [organizations.id],
	}),
}));

export const platformInvites = pgTable("platform_invites", {
	id: text("id").primaryKey(),
	token: text("token").notNull().unique(),
	industryRole: text("industry_role").notNull(),
	initialCredits: integer("initial_credits").default(50).notNull(),
	status: text("status").default("unused").notNull(), // 'unused', 'used', 'expired'
	email: text("email"), // Optional: Restrict to specific email
	createdAt: timestamp("created_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at"),
});

export const demoRequests = pgTable("demo_requests", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull(),
	industry: text("industry").notNull(),
	company: text("company"),
	country: text("country").default("KW").notNull(),
	status: text("status").default("pending").notNull(), // 'pending', 'approved', 'rejected'
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
export const creditBuckets = pgTable("credit_buckets", {
	id: text("id").primaryKey(),
	organizationId: text("organization_id")
		.notNull()
		.references(() => organizations.id),
	amount: integer("amount").notNull(), // Remaining credits in this specific bucket
	initialAmount: integer("initial_amount").notNull(), // Original purchase amount
	expiryDate: timestamp("expiry_date"), // Made nullable per SOP: No expiry
	noticeSent: boolean("notice_sent").default(false).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditBucketsRelations = relations(creditBuckets, ({ one }) => ({
	organization: one(organizations, {
		fields: [creditBuckets.organizationId],
		references: [organizations.id],
	}),
}));

export const models = pgTable("models", {
	id: text("id").primaryKey(), // OpenRouter ID: e.g. "qwen/qwen3-235b-a22b-2507"
	name: text("name").notNull(),
	provider: text("provider").notNull().default("OpenRouter"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
	id: text("id").primaryKey(), // e.g. "legal-assistant-os"
	activeLlmModelId: text("active_llm_model_id")
		.notNull()
		.references(() => models.id),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
