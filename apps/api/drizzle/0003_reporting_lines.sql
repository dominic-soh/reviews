CREATE TABLE "reporting_lines" (
	"membership_id" text PRIMARY KEY NOT NULL,
	"manager_membership_id" text NOT NULL,
	"company_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_manager_membership_id_memberships_id_fk" FOREIGN KEY ("manager_membership_id") REFERENCES "public"."memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;