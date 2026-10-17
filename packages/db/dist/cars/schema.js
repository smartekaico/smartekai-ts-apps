"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outboundClicks = exports.creditPurchases = exports.creditLedger = exports.builds = exports.presets = exports.parts = exports.vehicles = exports.carsVerifications = exports.carsAccounts = exports.carsSessions = exports.carsUsers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
// Better Auth tables (guests via the anonymous plugin, accounts via email or Google).
exports.carsUsers = (0, pg_core_1.pgTable)("cars_user", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    emailVerified: (0, pg_core_1.boolean)("email_verified").notNull(),
    image: (0, pg_core_1.text)("image"),
    isAnonymous: (0, pg_core_1.boolean)("is_anonymous").default(false),
    // Spec 3 §1. Guests never hold credits; every user (guest or account) gets
    // one free render. Better Auth never writes these — the defaults apply.
    creditBalance: (0, pg_core_1.integer)("credit_balance").notNull().default(0),
    freeRenderUsed: (0, pg_core_1.boolean)("free_render_used").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
});
exports.carsSessions = (0, pg_core_1.pgTable)("cars_session", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.carsUsers.id, { onDelete: "cascade" }),
    token: (0, pg_core_1.text)("token").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    ipAddress: (0, pg_core_1.text)("ip_address"),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
}, (table) => ({
    tokenIdx: (0, pg_core_1.index)("cars_session_token_idx").on(table.token),
    userIdx: (0, pg_core_1.index)("cars_session_user_idx").on(table.userId),
}));
exports.carsAccounts = (0, pg_core_1.pgTable)("cars_account", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id")
        .notNull()
        .references(() => exports.carsUsers.id, { onDelete: "cascade" }),
    accountId: (0, pg_core_1.text)("account_id").notNull(),
    providerId: (0, pg_core_1.text)("provider_id").notNull(),
    accessToken: (0, pg_core_1.text)("access_token"),
    refreshToken: (0, pg_core_1.text)("refresh_token"),
    idToken: (0, pg_core_1.text)("id_token"),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)("access_token_expires_at"),
    refreshTokenExpiresAt: (0, pg_core_1.timestamp)("refresh_token_expires_at"),
    scope: (0, pg_core_1.text)("scope"),
    // Pre-1.x column, superseded by accessTokenExpiresAt; kept until data is checked.
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    password: (0, pg_core_1.text)("password"),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
}, (table) => ({
    userIdx: (0, pg_core_1.index)("cars_account_user_idx").on(table.userId),
}));
exports.carsVerifications = (0, pg_core_1.pgTable)("cars_verification", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    identifier: (0, pg_core_1.text)("identifier").notNull(),
    value: (0, pg_core_1.text)("value").notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull(),
});
exports.vehicles = (0, pg_core_1.pgTable)("vehicles", {
    id: (0, pg_core_1.text)("id").primaryKey(), // "lc300" | "patrol-y62" | "wrangler-jl"
    name: (0, pg_core_1.text)("name").notNull(),
    yearRange: (0, pg_core_1.text)("year_range").notNull(),
    stockImageKey: (0, pg_core_1.text)("stock_image_key"), // "stock/<id>.<ext>" in cars-renders; null until uploaded
    sortOrder: (0, pg_core_1.integer)("sort_order").notNull().default(0),
});
exports.parts = (0, pg_core_1.pgTable)("parts", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    category: (0, pg_core_1.text)("category").notNull(), // armor | wheels_tires | overland | suspension | lighting
    brand: (0, pg_core_1.text)("brand").notNull(),
    priceUsd: (0, pg_core_1.numeric)("price_usd", { precision: 10, scale: 2 }).notNull(),
    laborHoursEst: (0, pg_core_1.numeric)("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
    fitmentDifficulty: (0, pg_core_1.text)("fitment_difficulty").notNull(), // "Direct Bolt-On" | "Minor Trimming" | "Custom Fabrication"
    aiPromptSnippet: (0, pg_core_1.text)("ai_prompt_snippet").notNull(),
    imageUrl: (0, pg_core_1.text)("image_url").notNull().default(""), // "" = no licensed image yet
    vehicleIds: (0, pg_core_1.text)("vehicle_ids").array().notNull(),
    affiliateUrl: (0, pg_core_1.text)("affiliate_url"), // null = no partner link yet (Buy stays hidden)
});
exports.presets = (0, pg_core_1.pgTable)("presets", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    slug: (0, pg_core_1.text)("slug").notNull().unique(), // also the curated build's slug
    vehicleId: (0, pg_core_1.text)("vehicle_id")
        .notNull()
        .references(() => exports.vehicles.id),
    name: (0, pg_core_1.text)("name").notNull(),
    partIds: (0, pg_core_1.text)("part_ids").array().notNull(),
    sortOrder: (0, pg_core_1.integer)("sort_order").notNull().default(0),
});
exports.builds = (0, pg_core_1.pgTable)("builds", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    slug: (0, pg_core_1.text)("slug").unique(), // curated builds only
    vehicleId: (0, pg_core_1.text)("vehicle_id")
        .notNull()
        .references(() => exports.vehicles.id),
    presetId: (0, pg_core_1.text)("preset_id").references(() => exports.presets.id),
    // Owner: a guest (anonymous) or account user. null = curated, or a guest
    // whose anonymous sign-in failed. Moved to the account by onLinkAccount.
    userId: (0, pg_core_1.text)("user_id").references(() => exports.carsUsers.id, { onDelete: "set null" }),
    isCurated: (0, pg_core_1.boolean)("is_curated").notNull().default(false),
    // Storage keys, never URLs — read URLs are generated at request time.
    // Keys under "stock/" live in cars-renders (public); others in cars-uploads (private).
    originalImageKey: (0, pg_core_1.text)("original_image_key").notNull(),
    renderKey: (0, pg_core_1.text)("render_key"),
    status: (0, pg_core_1.text)("status").$type().notNull().default("draft"),
    errorMessage: (0, pg_core_1.text)("error_message"),
    charge: (0, pg_core_1.text)("charge").$type(),
    selectedPartIds: (0, pg_core_1.text)("selected_part_ids").array().notNull(),
    detectedVehicle: (0, pg_core_1.jsonb)("detected_vehicle").$type(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    createdAtIdx: (0, pg_core_1.index)("builds_created_at_idx").on(table.createdAt),
    userIdx: (0, pg_core_1.index)("builds_user_id_idx").on(table.userId),
}));
// Audit trail of every balance change (Spec 3 §1). Purchases are idempotent
// by the unique payment_ref (provider-neutral; NOWPayments:
// "nowpayments:<payment_id>"). build_id has no FK: the ledger outlives
// cleaned-up builds.
exports.creditLedger = (0, pg_core_1.pgTable)("credit_ledger", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    // Nullable + set null: deleting a user keeps their purchase history (audit trail).
    userId: (0, pg_core_1.text)("user_id").references(() => exports.carsUsers.id, { onDelete: "set null" }),
    delta: (0, pg_core_1.integer)("delta").notNull(), // +N purchase/refund/grant, −RENDER_COST render
    reason: (0, pg_core_1.text)("reason").$type().notNull(),
    buildId: (0, pg_core_1.text)("build_id"),
    paymentRef: (0, pg_core_1.text)("payment_ref").unique("credit_ledger_payment_ref_unique"),
    amountUsd: (0, pg_core_1.numeric)("amount_usd", { precision: 10, scale: 2 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
}, (table) => ({
    userIdx: (0, pg_core_1.index)("credit_ledger_user_id_idx").on(table.userId),
}));
// One row per checkout attempt (Spec 3 §1/§5). id is also the NOWPayments
// order_id. amount_usd snapshots the pack price at checkout.
exports.creditPurchases = (0, pg_core_1.pgTable)("credit_purchases", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.text)("user_id").references(() => exports.carsUsers.id, { onDelete: "set null" }),
    packId: (0, pg_core_1.text)("pack_id").notNull(),
    credits: (0, pg_core_1.integer)("credits").notNull(),
    amountUsd: (0, pg_core_1.numeric)("amount_usd", { precision: 10, scale: 2 }).notNull(),
    providerInvoiceId: (0, pg_core_1.text)("provider_invoice_id"),
    providerPaymentId: (0, pg_core_1.text)("provider_payment_id").unique("credit_purchases_provider_payment_id_unique"),
    status: (0, pg_core_1.text)("status").$type().notNull().default("pending"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => ({
    userIdx: (0, pg_core_1.index)("credit_purchases_user_id_idx").on(table.userId),
}));
exports.outboundClicks = (0, pg_core_1.pgTable)("outbound_clicks", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    partId: (0, pg_core_1.text)("part_id").notNull(),
    buildId: (0, pg_core_1.text)("build_id"), // no FK: clicks outlive cleaned-up builds
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
