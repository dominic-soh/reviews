DELETE FROM "personal_sign_ins";--> statement-breakpoint
ALTER TABLE "personal_sign_ins" DROP COLUMN "token";--> statement-breakpoint
ALTER TABLE "personal_sign_ins" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "personal_sign_ins" ADD COLUMN "code_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_sign_ins" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;