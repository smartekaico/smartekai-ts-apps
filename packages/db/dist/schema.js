"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditBucketsRelations = exports.auditLogsRelations = exports.soapNotesRelations = exports.medicalEncountersRelations = exports.patientsRelations = exports.organizationsRelations = exports.usersRelations = exports.products = exports.models = exports.demoRequests = exports.platformInvites = exports.auditLogs = exports.creditBuckets = exports.medicalTemplates = exports.soapNotes = exports.medicalEncounters = exports.patients = exports.ledgers = exports.appointments = exports.savedDocuments = exports.kbUploadLog = exports.kbChunks = exports.knowledgeBase = exports.generatedContracts = exports.contractTemplates = exports.sessionEvents = exports.sessionDocs = exports.sessionChats = exports.workSessions = exports.cases = exports.clients = exports.caseAnalyses = exports.caseCategories = exports.jurisdictions = exports.verifications = exports.accounts = exports.sessions = exports.invitations = exports.members = exports.organizations = exports.users = exports.vector = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
// Vector type for pgvector (768-dim for Gemini embeddings)
exports.vector = (0, pg_core_1.customType)({
    dataType() {
        return "vector(768)";
    },
    toDriver(value) {
        return `[${value.join(",")}]`;
    },
});
// ============================================
// CORE TABLES (Shared between Legal & Medical)
// ============================================
exports.users = (0, pg_core_1.pgTable)("user", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    emailVerified: (0, pg_core_1.boolean)("email_verified").notNull(),
    image: (0, pg_core_1.text)("image"),
    firmName: (0, pg_core_1.text)("firm_name"),
    subscriptionTier: (0, pg_core_1.text)("subscription_tier").default("free").notNull(),
    creditBalance: (0, pg_core_1.integer)("credit_balance").default(0).notNull(), // Deprecated; org-level credits are authoritative
    firmBranding: (0, pg_core_1.text)("firm_branding"),
    activeOrganizationId: (0, pg_core_1.text)("active_organization_id"),
    industryRole: (0, pg_core_1.text)("industry_role").default("LEGAL").notNull(), // LEGAL, MEDICAL, MIXED, ADMIN
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
});
exports.organizations = (0, pg_core_1.pgTable)("organization", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    slug: (0, pg_core_1.text)("slug").unique(),
    logo: (0, pg_core_1.text)("logo"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    metadata: (0, pg_core_1.text)("metadata"),
    industry: (0, pg_core_1.text)("industry").default("MIXED").notNull(), // LEGAL, MEDICAL, MIXED
    creditBalance: (0, pg_core_1.integer)("credit_balance").default(50).notNull(),
    defaultJurisdiction: (0, pg_core_1.text)("default_jurisdiction").default("kuwait"),
});
exports.members = (0, pg_core_1.pgTable)("member", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    role: (0, pg_core_1.text)("role").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)("member_org_idx").on(table.organizationId),
    userIdx: (0, pg_core_1.index)("member_user_idx").on(table.userId),
}));
exports.invitations = (0, pg_core_1.pgTable)("invitation", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id")
        .notNull()
        .references(() => exports.organizations.id, { onDelete: "cascade" }),
    email: (0, pg_core_1.text)("email").notNull(),
    role: (0, pg_core_1.text)("role").notNull(),
    status: (0, pg_core_1.text)("status").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    inviterId: (0, pg_core_1.text)("inviter_id").references(() => exports.users.id),
});
exports.sessions = (0, pg_core_1.pgTable)("session", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    token: (0, pg_core_1.text)("token").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    activeOrganizationId: (0, pg_core_1.text)("active_organization_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
}, (table) => ({
    tokenIdx: (0, pg_core_1.index)("session_token_idx").on(table.token),
    userIdx: (0, pg_core_1.index)("session_user_idx").on(table.userId),
}));
exports.accounts = (0, pg_core_1.pgTable)("account", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    accountId: (0, pg_core_1.text)("account_id").notNull(),
    providerId: (0, pg_core_1.text)("provider_id").notNull(),
    accessToken: (0, pg_core_1.text)("access_token"),
    refreshToken: (0, pg_core_1.text)("refresh_token"),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    password: (0, pg_core_1.text)("password"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
}, (table) => ({
    userIdx: (0, pg_core_1.index)("account_user_idx").on(table.userId),
}));
exports.verifications = (0, pg_core_1.pgTable)("verification", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    value: (0, pg_core_1.text)("value").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
});
// ============================================
// LEGAL TABLES
// ============================================
exports.jurisdictions = (0, pg_core_1.pgTable)("kb_jurisdictions", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    code: (0, pg_core_1.text)("code").notNull(),
    nameAr: (0, pg_core_1.text)("name_ar").notNull(),
    nameEn: (0, pg_core_1.text)("name_en").notNull(),
    metadata: (0, pg_core_1.text)("metadata"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => ({
    codeIdx: (0, pg_core_1.index)("jurisdiction_code_idx").on(table.code),
}));
exports.caseCategories = (0, pg_core_1.pgTable)("kb_categories", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    slug: (0, pg_core_1.text)("slug").notNull().unique(),
    nameAr: (0, pg_core_1.text)("name_ar").notNull(),
    nameEn: (0, pg_core_1.text)("name_en").notNull(),
    descriptionAr: (0, pg_core_1.text)("description_ar").notNull(),
    jurisdictionId: (0, pg_core_1.text)("jurisdiction_id")
        .notNull()
        .references(() => exports.jurisdictions.id),
    workspaceSlug: (0, pg_core_1.text)("workspace_slug").notNull(),
    creditsCost: (0, pg_core_1.integer)("credits_cost").notNull().default(3),
    icon: (0, pg_core_1.text)("icon"),
    industry: (0, pg_core_1.text)("industry").notNull().default("LEGAL"),
    legalDomain: (0, pg_core_1.text)("legal_domain").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    jurisdictionIdx: (0, pg_core_1.index)("case_category_jurisdiction_idx").on(table.jurisdictionId),
}));
exports.caseAnalyses = (0, pg_core_1.pgTable)("case_analyses", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    caseCategoryId: (0, pg_core_1.text)("case_category_id")
        .notNull()
        .references(() => exports.caseCategories.id),
    jurisdictionId: (0, pg_core_1.text)("jurisdiction_id")
        .notNull()
        .references(() => exports.jurisdictions.id),
    caseTitleAr: (0, pg_core_1.text)("case_title_ar").notNull(),
    rawInputText: (0, pg_core_1.text)("raw_input_text").notNull(),
    conversationId: (0, pg_core_1.text)("conversation_id"),
    clarificationTurns: (0, pg_core_1.jsonb)("clarification_turns"),
    clarificationCount: (0, pg_core_1.integer)("clarification_count").default(0).notNull(),
    finalAnalysisText: (0, pg_core_1.text)("final_analysis_text"),
    finalDraftText: (0, pg_core_1.text)("final_draft_text"),
    status: (0, pg_core_1.text)("status").default("draft").notNull(),
    creditsConsumed: (0, pg_core_1.integer)("credits_consumed").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)("case_analysis_org_idx").on(table.organizationId),
    userIdx: (0, pg_core_1.index)("case_analysis_user_idx").on(table.userId),
}));
exports.clients = (0, pg_core_1.pgTable)("clients", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    phone: (0, pg_core_1.text)("phone"),
    civilId: (0, pg_core_1.text)("civil_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.cases = (0, pg_core_1.pgTable)("cases", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id")
        .notNull()
        .references(() => exports.organizations.id),
    clientId: (0, pg_core_1.text)("client_id")
        .notNull()
        .references(() => exports.clients.id),
    title: (0, pg_core_1.text)("title").notNull(),
    caseNumber: (0, pg_core_1.text)("case_number"),
    plaintiff: (0, pg_core_1.text)("plaintiff"),
    defendant: (0, pg_core_1.text)("defendant"),
    status: (0, pg_core_1.text)("status").default("Active").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.workSessions = (0, pg_core_1.pgTable)("work_sessions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id")
        .notNull()
        .references(() => exports.organizations.id),
    caseId: (0, pg_core_1.integer)("case_id").references(() => exports.cases.id),
    title: (0, pg_core_1.text)("title").default("جلسة عمل جديدة"), // "New Working Session"
    tag: (0, pg_core_1.text)("tag").default("عام"), // e.g. Civil, Criminal, General
    categoryId: (0, pg_core_1.text)("category_id").references(() => exports.caseCategories.id),
    status: (0, pg_core_1.text)("status").default("Open").notNull(),
    isFavorite: (0, pg_core_1.boolean)("is_favorite").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
});
exports.sessionChats = (0, pg_core_1.pgTable)("session_chats", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.integer)("session_id")
        .references(() => exports.workSessions.id)
        .notNull(),
    role: (0, pg_core_1.text)("role").notNull(), // 'user' or 'assistant'
    content: (0, pg_core_1.text)("content").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.sessionDocs = (0, pg_core_1.pgTable)("session_docs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.integer)("session_id")
        .references(() => exports.workSessions.id)
        .notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    content: (0, pg_core_1.text)("content").notNull(), // TipTap HTML
    docType: (0, pg_core_1.text)("doc_type").default("Draft").notNull(),
    categoryId: (0, pg_core_1.text)("category_id").references(() => exports.caseCategories.id),
    embedding: (0, exports.vector)("embedding"), // Gemini 2 embedding for Hybrid Search
    status: (0, pg_core_1.text)("status").default("Open").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
});
exports.sessionEvents = (0, pg_core_1.pgTable)("session_events", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.integer)("session_id")
        .references(() => exports.workSessions.id)
        .notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    eventType: (0, pg_core_1.text)("event_type").default("Deadline").notNull(), // 'Hearing', 'Expert', 'Deadline', 'Meeting'
    eventDate: (0, pg_core_1.timestamp)("event_date").notNull(),
    court: (0, pg_core_1.text)("court"), // المحكمة
    circuit: (0, pg_core_1.text)("circuit"), // الدائرة
    rollNumber: (0, pg_core_1.text)("roll_number"), // رقم الرول / القاعة
    description: (0, pg_core_1.text)("description"), // الوصف / المطلوب
    assignedUserId: (0, pg_core_1.text)("assigned_to").references(() => exports.users.id),
    reminderEnabled: (0, pg_core_1.boolean)("reminder_enabled").default(false).notNull(),
    reminderDays: (0, pg_core_1.integer)("reminder_days").default(1), // Days before to remind
    status: (0, pg_core_1.text)("status").default("Upcoming").notNull(), // 'Upcoming', 'Completed'
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
});
exports.contractTemplates = (0, pg_core_1.pgTable)("contract_templates", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    slug: (0, pg_core_1.text)("slug").notNull().unique(),
    nameAr: (0, pg_core_1.text)("name_ar").notNull(),
    nameEn: (0, pg_core_1.text)("name_en").notNull(),
    descriptionAr: (0, pg_core_1.text)("description_ar").notNull(),
    jurisdictionId: (0, pg_core_1.text)("jurisdiction_id")
        .notNull()
        .references(() => exports.jurisdictions.id),
    category: (0, pg_core_1.text)("category").notNull(),
    markdownTemplate: (0, pg_core_1.text)("markdown_template").notNull(),
    variablesSchema: (0, pg_core_1.jsonb)("variables_schema").notNull(),
    creditsCost: (0, pg_core_1.integer)("credits_cost").notNull().default(2),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.generatedContracts = (0, pg_core_1.pgTable)("generated_contracts", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    templateId: (0, pg_core_1.text)("template_id")
        .notNull()
        .references(() => exports.contractTemplates.id),
    filledVariables: (0, pg_core_1.jsonb)("filled_variables").notNull(),
    finalContractText: (0, pg_core_1.text)("final_contract_text"),
    aiReviewNotes: (0, pg_core_1.text)("ai_review_notes"),
    aiReviewPassed: (0, pg_core_1.boolean)("ai_review_passed"),
    status: (0, pg_core_1.text)("status").default("draft").notNull(),
    creditsConsumed: (0, pg_core_1.integer)("credits_consumed").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.knowledgeBase = (0, pg_core_1.pgTable)("kb_documents", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    jurisdiction: (0, pg_core_1.text)("jurisdiction").notNull(),
    categoryId: (0, pg_core_1.text)("category_id"),
    docType: (0, pg_core_1.text)("doc_type").notNull(),
    title: (0, pg_core_1.text)("title").notNull(),
    titleEn: (0, pg_core_1.text)("title_en"),
    slug: (0, pg_core_1.text)("slug").notNull().unique(),
    sourceRef: (0, pg_core_1.text)("source_ref"),
    sourceUrl: (0, pg_core_1.text)("source_url"),
    language: (0, pg_core_1.text)("language").default("ar").notNull(),
    version: (0, pg_core_1.text)("version"),
    rawMarkdown: (0, pg_core_1.text)("raw_markdown").notNull(),
    frontmatter: (0, pg_core_1.jsonb)("frontmatter"),
    fileHash: (0, pg_core_1.text)("file_hash").notNull(),
    status: (0, pg_core_1.text)("status").default("active").notNull(),
    uploadedBy: (0, pg_core_1.text)("uploaded_by").default("system").notNull(),
    industry: (0, pg_core_1.text)("industry").notNull().default("LEGAL"),
    tags: (0, pg_core_1.jsonb)("tags").default([]).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => {
    return {
        orgIdx: (0, pg_core_1.index)("kb_org_idx").on(table.organizationId),
    };
});
exports.kbChunks = (0, pg_core_1.pgTable)("kb_chunks", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    documentId: (0, pg_core_1.integer)("document_id")
        .notNull()
        .references(() => exports.knowledgeBase.id),
    chunkIndex: (0, pg_core_1.integer)("chunk_index").notNull(),
    chunkId: (0, pg_core_1.text)("chunk_id").notNull(),
    headingPath: (0, pg_core_1.text)("heading_path"),
    headingLevel: (0, pg_core_1.integer)("heading_level"),
    contentMd: (0, pg_core_1.text)("content_md").notNull(),
    contentText: (0, pg_core_1.text)("content_text").notNull(),
    contentTsv: (0, pg_core_1.customType)({
        dataType() {
            return "tsvector";
        },
    })("content_tsv"),
    tokensEst: (0, pg_core_1.integer)("tokens_est").notNull(),
    embedding: (0, exports.vector)("embedding"),
    industry: (0, pg_core_1.text)("industry").notNull().default("LEGAL"),
    citationLabel: (0, pg_core_1.text)("citation_label"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
});
exports.kbUploadLog = (0, pg_core_1.pgTable)("kb_upload_log", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    documentId: (0, pg_core_1.integer)("document_id"),
    action: (0, pg_core_1.text)("action").notNull(), // 'create', 'update', 'reindex', 'delete'
    status: (0, pg_core_1.text)("status").notNull(), // 'success', 'error'
    chunksCount: (0, pg_core_1.integer)("chunks_count").default(0),
    durationMs: (0, pg_core_1.integer)("duration_ms"),
    uploadedBy: (0, pg_core_1.text)("uploaded_by"),
    errorMessage: (0, pg_core_1.text)("error_message"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.savedDocuments = (0, pg_core_1.pgTable)("saved_documents", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id").references(() => exports.users.id),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    title: (0, pg_core_1.text)("title"),
    content: (0, pg_core_1.text)("content"),
    docType: (0, pg_core_1.text)("doc_type"),
    categoryId: (0, pg_core_1.text)("category_id").references(() => exports.caseCategories.id),
    status: (0, pg_core_1.text)("status").default("Open").notNull(),
    sourceText: (0, pg_core_1.text)("source_text"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.appointments = (0, pg_core_1.pgTable)("appointments", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    caseId: (0, pg_core_1.text)("case_id").references(() => exports.caseAnalyses.id),
    title: (0, pg_core_1.text)("title").notNull(),
    appointmentDate: (0, pg_core_1.timestamp)("appointment_date").notNull(),
    reminderDate: (0, pg_core_1.timestamp)("reminder_date").notNull(),
    status: (0, pg_core_1.text)("status").default("upcoming").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.ledgers = (0, pg_core_1.pgTable)("ledgers", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.users.id),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    amount: (0, pg_core_1.integer)("amount").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// ============================================
// MEDICAL TABLES
// ============================================
exports.patients = (0, pg_core_1.pgTable)("patient", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id")
        .notNull()
        .references(() => exports.organizations.id),
    medicalRecordNumber: (0, pg_core_1.text)("medical_record_number"),
    fullName: (0, pg_core_1.text)("full_name").notNull(),
    dateOfBirth: (0, pg_core_1.timestamp)("date_of_birth"),
    gender: (0, pg_core_1.text)("gender"),
    phone: (0, pg_core_1.text)("phone"),
    email: (0, pg_core_1.text)("email"),
    address: (0, pg_core_1.text)("address"),
    emergencyContact: (0, pg_core_1.text)("emergency_contact"),
    emergencyPhone: (0, pg_core_1.text)("emergency_phone"),
    bloodType: (0, pg_core_1.text)("blood_type"),
    allergies: (0, pg_core_1.text)("allergies").array(),
    medications: (0, pg_core_1.text)("medications").array(),
    medicalHistory: (0, pg_core_1.text)("medical_history"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at"),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)("patient_org_idx").on(table.organizationId),
    mrnIdx: (0, pg_core_1.index)("patient_mrn_idx").on(table.medicalRecordNumber),
}));
exports.medicalEncounters = (0, pg_core_1.pgTable)("medical_encounter", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id")
        .notNull()
        .references(() => exports.organizations.id),
    patientId: (0, pg_core_1.text)("patient_id").references(() => exports.patients.id),
    providerId: (0, pg_core_1.text)("provider_id").references(() => exports.users.id),
    encounterDate: (0, pg_core_1.timestamp)("encounter_date").notNull(),
    encounterType: (0, pg_core_1.text)("encounter_type"), // office, telehealth, hospital, emergency
    chiefComplaint: (0, pg_core_1.text)("chief_complaint"),
    status: (0, pg_core_1.text)("status").default("in_progress").notNull(),
    creditsConsumed: (0, pg_core_1.integer)("credits_consumed").default(0),
    recordingUrl: (0, pg_core_1.text)("recording_url"),
    transcriptionText: (0, pg_core_1.text)("transcription_text"),
    soapNoteId: (0, pg_core_1.text)("soap_note_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at"),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)("encounter_org_idx").on(table.organizationId),
    patientIdx: (0, pg_core_1.index)("encounter_patient_idx").on(table.patientId),
}));
exports.soapNotes = (0, pg_core_1.pgTable)("soap_note", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    encounterId: (0, pg_core_1.text)("encounter_id").references(() => exports.medicalEncounters.id),
    organizationId: (0, pg_core_1.text)("organization_id")
        .notNull()
        .references(() => exports.organizations.id),
    subjective: (0, pg_core_1.jsonb)("subjective"),
    objective: (0, pg_core_1.jsonb)("objective"),
    assessment: (0, pg_core_1.jsonb)("assessment"),
    plan: (0, pg_core_1.jsonb)("plan"),
    metadata: (0, pg_core_1.jsonb)("metadata"),
    status: (0, pg_core_1.text)("status").default("draft").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at"),
}, (table) => ({
    encounterIdx: (0, pg_core_1.index)("soap_encounter_idx").on(table.encounterId),
    orgIdx: (0, pg_core_1.index)("soap_org_idx").on(table.organizationId),
}));
exports.medicalTemplates = (0, pg_core_1.pgTable)("medical_template", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    name: (0, pg_core_1.text)("name").notNull(),
    specialty: (0, pg_core_1.text)("specialty").notNull(), // primary_care, cardiology, etc.
    templateType: (0, pg_core_1.text)("template_type").notNull(), // soap, dap, progress_note
    structure: (0, pg_core_1.jsonb)("structure").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)("template_org_idx").on(table.organizationId),
    specialtyIdx: (0, pg_core_1.index)("template_specialty_idx").on(table.specialty),
}));
// ============================================
// SHARED TABLES
// ============================================
exports.creditBuckets = (0, pg_core_1.pgTable)("credit_buckets", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    organizationId: (0, pg_core_1.text)("organization_id")
        .notNull()
        .references(() => exports.organizations.id),
    amount: (0, pg_core_1.integer)("amount").notNull(),
    initialAmount: (0, pg_core_1.integer)("initial_amount").notNull(),
    expiryDate: (0, pg_core_1.timestamp)("expiry_date"),
    noticeSent: (0, pg_core_1.boolean)("notice_sent").default(false).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)("credit_bucket_org_idx").on(table.organizationId),
}));
exports.auditLogs = (0, pg_core_1.pgTable)("audit_logs", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id").references(() => exports.users.id),
    organizationId: (0, pg_core_1.text)("organization_id").references(() => exports.organizations.id),
    action: (0, pg_core_1.text)("action").notNull(),
    details: (0, pg_core_1.text)("details"),
    creditsSpent: (0, pg_core_1.integer)("credits_spent").default(0).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    orgIdx: (0, pg_core_1.index)("audit_org_idx").on(table.organizationId),
    userIdx: (0, pg_core_1.index)("audit_user_idx").on(table.userId),
}));
exports.platformInvites = (0, pg_core_1.pgTable)("platform_invites", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    token: (0, pg_core_1.text)("token").notNull().unique(),
    industryRole: (0, pg_core_1.text)("industry_role").notNull(),
    initialCredits: (0, pg_core_1.integer)("initial_credits").default(50).notNull(),
    status: (0, pg_core_1.text)("status").default("unused").notNull(), // 'unused', 'used', 'expired'
    email: (0, pg_core_1.text)("email"), // Optional: Restrict to specific email
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
});
exports.demoRequests = (0, pg_core_1.pgTable)("demo_requests", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull(),
    industry: (0, pg_core_1.text)("industry").notNull(),
    company: (0, pg_core_1.text)("company"),
    country: (0, pg_core_1.text)("country").default("KW").notNull(),
    status: (0, pg_core_1.text)("status").default("pending").notNull(), // 'pending', 'approved', 'rejected'
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.models = (0, pg_core_1.pgTable)("models", {
    id: (0, pg_core_1.text)("id").primaryKey(), // OpenRouter ID: e.g. "qwen/qwen3-235b-a22b-2507"
    name: (0, pg_core_1.text)("name").notNull(),
    provider: (0, pg_core_1.text)("provider").notNull().default("OpenRouter"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
exports.products = (0, pg_core_1.pgTable)("products", {
    id: (0, pg_core_1.text)("id").primaryKey(), // e.g. "legal-assistant-os"
    activeLlmModelId: (0, pg_core_1.text)("active_llm_model_id")
        .notNull()
        .references(() => exports.models.id),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// ============================================
// RELATIONS
// ============================================
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ one, many }) => ({
    activeOrganization: one(exports.organizations, {
        fields: [exports.users.activeOrganizationId],
        references: [exports.organizations.id],
    }),
    memberships: many(exports.members),
    accounts: many(exports.accounts),
}));
exports.organizationsRelations = (0, drizzle_orm_1.relations)(exports.organizations, ({ many }) => ({
    members: many(exports.members),
    patients: many(exports.patients),
    encounters: many(exports.medicalEncounters),
    soapNotes: many(exports.soapNotes),
}));
exports.patientsRelations = (0, drizzle_orm_1.relations)(exports.patients, ({ one, many }) => ({
    organization: one(exports.organizations, {
        fields: [exports.patients.organizationId],
        references: [exports.organizations.id],
    }),
    encounters: many(exports.medicalEncounters),
}));
exports.medicalEncountersRelations = (0, drizzle_orm_1.relations)(exports.medicalEncounters, ({ one, many }) => ({
    organization: one(exports.organizations, {
        fields: [exports.medicalEncounters.organizationId],
        references: [exports.organizations.id],
    }),
    patient: one(exports.patients, {
        fields: [exports.medicalEncounters.patientId],
        references: [exports.patients.id],
    }),
    soapNote: one(exports.soapNotes),
}));
exports.soapNotesRelations = (0, drizzle_orm_1.relations)(exports.soapNotes, ({ one }) => ({
    encounter: one(exports.medicalEncounters, {
        fields: [exports.soapNotes.encounterId],
        references: [exports.medicalEncounters.id],
    }),
    organization: one(exports.organizations, {
        fields: [exports.soapNotes.organizationId],
        references: [exports.organizations.id],
    }),
}));
exports.auditLogsRelations = (0, drizzle_orm_1.relations)(exports.auditLogs, ({ one }) => ({
    user: one(exports.users, {
        fields: [exports.auditLogs.userId],
        references: [exports.users.id],
    }),
    organization: one(exports.organizations, {
        fields: [exports.auditLogs.organizationId],
        references: [exports.organizations.id],
    }),
}));
exports.creditBucketsRelations = (0, drizzle_orm_1.relations)(exports.creditBuckets, ({ one }) => ({
    organization: one(exports.organizations, {
        fields: [exports.creditBuckets.organizationId],
        references: [exports.organizations.id],
    }),
}));
