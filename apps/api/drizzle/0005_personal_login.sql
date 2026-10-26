CREATE TABLE "personal_sign_ins" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "personal_email" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "login_kind" text DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_sign_ins" ADD CONSTRAINT "personal_sign_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_personal_email_unique" UNIQUE("personal_email");