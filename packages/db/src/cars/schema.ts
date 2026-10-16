import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Cars 4x4 customizer — dedicated database (DATABASE_NEONDB_SMARTEKAI).
// Pushed with drizzle.cars.config.ts, never with the shared legal/medical config.

export type DetectedVehicle = {
  make: string | null;
  model: string | null;
  color: string | null;
};
export type BuildStatus = "draft" | "processing" | "completed" | "failed";

// Better Auth tables (guests via the anonymous plugin, accounts via email or Google).
export const carsUsers = pgTable("cars_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const carsSessions = pgTable(
  "cars_session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => carsUsers.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => ({
    tokenIdx: index("cars_session_token_idx").on(table.token),
    userIdx: index("cars_session_user_idx").on(table.userId),
  }),
);

export const carsAccounts = pgTable(
  "cars_account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => carsUsers.id, { onDelete: "cascade" }),
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
  },
  (table) => ({
    userIdx: index("cars_account_user_idx").on(table.userId),
  }),
);

export const carsVerifications = pgTable("cars_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(), // "lc300" | "patrol-y62" | "wrangler-jl"
  name: text("name").notNull(),
  yearRange: text("year_range").notNull(),
  stockImageKey: text("stock_image_key"), // "stock/<id>.<ext>" in cars-renders; null until uploaded
  sortOrder: integer("sort_order").notNull().default(0),
});

export const parts = pgTable("parts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // armor | wheels_tires | overland | suspension | lighting
  brand: text("brand").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  laborHoursEst: numeric("labor_hours_est", { precision: 4, scale: 1 }).notNull(),
  fitmentDifficulty: text("fitment_difficulty").notNull(), // "Direct Bolt-On" | "Minor Trimming" | "Custom Fabrication"
  aiPromptSnippet: text("ai_prompt_snippet").notNull(),
  imageUrl: text("image_url").notNull().default(""), // "" = no licensed image yet
  vehicleIds: text("vehicle_ids").array().notNull(),
  affiliateUrl: text("affiliate_url"), // null = no partner link yet (Buy stays hidden)
});

export const presets = pgTable("presets", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(), // also the curated build's slug
  vehicleId: text("vehicle_id")
    .notNull()
    .references(() => vehicles.id),
  name: text("name").notNull(),
  partIds: text("part_ids").array().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const builds = pgTable(
  "builds",
  {
    id: text("id").primaryKey(),
    slug: text("slug").unique(), // curated builds only
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id),
    presetId: text("preset_id").references(() => presets.id),
    // Owner: a guest (anonymous) or account user. null = curated, or a guest
    // whose anonymous sign-in failed. Moved to the account by onLinkAccount.
    userId: text("user_id").references(() => carsUsers.id, { onDelete: "set null" }),
    isCurated: boolean("is_curated").notNull().default(false),
    // Storage keys, never URLs — read URLs are generated at request time.
    // Keys under "stock/" live in cars-renders (public); others in cars-uploads (private).
    originalImageKey: text("original_image_key").notNull(),
    renderKey: text("render_key"),
    status: text("status").$type<BuildStatus>().notNull().default("draft"),
    errorMessage: text("error_message"),
    selectedPartIds: text("selected_part_ids").array().notNull(),
    detectedVehicle: jsonb("detected_vehicle").$type<DetectedVehicle>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("builds_created_at_idx").on(table.createdAt),
    userIdx: index("builds_user_id_idx").on(table.userId),
  }),
);

export const outboundClicks = pgTable("outbound_clicks", {
  id: text("id").primaryKey(),
  partId: text("part_id").notNull(),
  buildId: text("build_id"), // no FK: clicks outlive cleaned-up builds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type Part = typeof parts.$inferSelect;
export type Preset = typeof presets.$inferSelect;
export type Build = typeof builds.$inferSelect;