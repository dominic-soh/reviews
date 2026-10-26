CREATE TABLE "criteria" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expectations" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"level_id" text NOT NULL,
	"criterion_id" text NOT NULL,
	"company_id" text NOT NULL,
	"body" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ladder_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"ladder_id" text NOT NULL,
	"company_id" text NOT NULL,
	"state" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ladders" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" text PRIMARY KEY NOT NULL,
	"version_id" text NOT NULL,
	"company_id" text NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "criteria" ADD CONSTRAINT "criteria_version_id_ladder_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."ladder_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expectations" ADD CONSTRAINT "expectations_version_id_ladder_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."ladder_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expectations" ADD CONSTRAINT "expectations_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expectations" ADD CONSTRAINT "expectations_criterion_id_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ladder_versions" ADD CONSTRAINT "ladder_versions_ladder_id_ladders_id_fk" FOREIGN KEY ("ladder_id") REFERENCES "public"."ladders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_version_id_ladder_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."ladder_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expectations_version_level_criterion" ON "expectations" USING btree ("version_id","level_id","criterion_id");--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ladders, ladder_versions, levels, criteria, expectations TO reviews_app;
--> statement-breakpoint
ALTER TABLE ladders ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE ladder_versions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE expectations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY ladders_tenant ON ladders FOR ALL TO reviews_app USING (company_id = current_setting('app.company_id', true)) WITH CHECK (company_id = current_setting('app.company_id', true));
--> statement-breakpoint
CREATE POLICY ladder_versions_tenant ON ladder_versions FOR ALL TO reviews_app USING (company_id = current_setting('app.company_id', true)) WITH CHECK (company_id = current_setting('app.company_id', true));
--> statement-breakpoint
CREATE POLICY levels_tenant ON levels FOR ALL TO reviews_app USING (company_id = current_setting('app.company_id', true)) WITH CHECK (company_id = current_setting('app.company_id', true));
--> statement-breakpoint
CREATE POLICY criteria_tenant ON criteria FOR ALL TO reviews_app USING (company_id = current_setting('app.company_id', true)) WITH CHECK (company_id = current_setting('app.company_id', true));
--> statement-breakpoint
CREATE POLICY expectations_tenant ON expectations FOR ALL TO reviews_app USING (company_id = current_setting('app.company_id', true)) WITH CHECK (company_id = current_setting('app.company_id', true));
