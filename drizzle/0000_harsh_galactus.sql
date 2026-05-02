CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"organization_id" text,
	"action" text NOT NULL,
	"details" text,
	"credits_spent" integer,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_analysis" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"organization_id" text NOT NULL,
	"case_category_id" text,
	"jurisdiction_id" text,
	"case_title_ar" text,
	"raw_input_text" text NOT NULL,
	"conversation_id" text,
	"clarification_turns" integer DEFAULT 0,
	"clarification_count" integer DEFAULT 0,
	"final_analysis_text" text,
	"final_draft_text" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"credits_consumed" integer DEFAULT 0,
	"created_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_category" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"description_ar" text,
	"jurisdiction_id" text,
	"credits_cost" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_bucket" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"amount" integer NOT NULL,
	"initial_amount" integer NOT NULL,
	"expiry_date" timestamp,
	"notice_sent" boolean DEFAULT false,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text
);
--> statement-breakpoint
CREATE TABLE "jurisdiction" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "jurisdiction_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "medical_encounter" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text,
	"provider_id" text,
	"encounter_date" timestamp NOT NULL,
	"encounter_type" text,
	"chief_complaint" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"credits_consumed" integer DEFAULT 0,
	"recording_url" text,
	"transcription_text" text,
	"soap_note_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "medical_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text,
	"name" text NOT NULL,
	"specialty" text NOT NULL,
	"template_type" text NOT NULL,
	"structure" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	"industry" text DEFAULT 'MIXED' NOT NULL,
	"credit_balance" integer DEFAULT 50 NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "patient" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"medical_record_number" text,
	"full_name" text NOT NULL,
	"date_of_birth" timestamp,
	"gender" text,
	"phone" text,
	"email" text,
	"address" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"blood_type" text,
	"allergies" text[],
	"medications" text[],
	"medical_history" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"active_organization_id" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "soap_note" (
	"id" text PRIMARY KEY NOT NULL,
	"encounter_id" text,
	"organization_id" text NOT NULL,
	"subjective" jsonb,
	"objective" jsonb,
	"assessment" jsonb,
	"plan" jsonb,
	"metadata" jsonb,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"active_organization_id" text,
	"industry_role" text DEFAULT 'LEGAL' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_analysis" ADD CONSTRAINT "case_analysis_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_analysis" ADD CONSTRAINT "case_analysis_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_analysis" ADD CONSTRAINT "case_analysis_case_category_id_case_category_id_fk" FOREIGN KEY ("case_category_id") REFERENCES "public"."case_category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_analysis" ADD CONSTRAINT "case_analysis_jurisdiction_id_jurisdiction_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdiction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_category" ADD CONSTRAINT "case_category_jurisdiction_id_jurisdiction_id_fk" FOREIGN KEY ("jurisdiction_id") REFERENCES "public"."jurisdiction"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_bucket" ADD CONSTRAINT "credit_bucket_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_encounter" ADD CONSTRAINT "medical_encounter_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_encounter" ADD CONSTRAINT "medical_encounter_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_encounter" ADD CONSTRAINT "medical_encounter_provider_id_user_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_template" ADD CONSTRAINT "medical_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_note" ADD CONSTRAINT "soap_note_encounter_id_medical_encounter_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."medical_encounter"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soap_note" ADD CONSTRAINT "soap_note_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_org_idx" ON "audit_log" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "case_analysis_org_idx" ON "case_analysis" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "case_analysis_user_idx" ON "case_analysis" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "case_category_org_idx" ON "case_category" USING btree ("jurisdiction_id");--> statement-breakpoint
CREATE INDEX "credit_bucket_org_idx" ON "credit_bucket" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "jurisdiction_code_idx" ON "jurisdiction" USING btree ("code");--> statement-breakpoint
CREATE INDEX "encounter_org_idx" ON "medical_encounter" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "encounter_patient_idx" ON "medical_encounter" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "template_org_idx" ON "medical_template" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "template_specialty_idx" ON "medical_template" USING btree ("specialty");--> statement-breakpoint
CREATE INDEX "member_org_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_user_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "patient_org_idx" ON "patient" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_mrn_idx" ON "patient" USING btree ("medical_record_number");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "soap_encounter_idx" ON "soap_note" USING btree ("encounter_id");--> statement-breakpoint
CREATE INDEX "soap_org_idx" ON "soap_note" USING btree ("organization_id");