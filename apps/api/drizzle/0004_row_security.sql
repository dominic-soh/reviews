GRANT reviews_app TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO reviews_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO reviews_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO reviews_app;
--> statement-breakpoint
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE reporting_lines ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE agent_tokens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY companies_tenant ON companies
  FOR ALL TO reviews_app
  USING (id = current_setting('app.company_id', true))
  WITH CHECK (id = current_setting('app.company_id', true));
--> statement-breakpoint
CREATE POLICY memberships_tenant ON memberships
  FOR ALL TO reviews_app
  USING (company_id = current_setting('app.company_id', true))
  WITH CHECK (company_id = current_setting('app.company_id', true));
--> statement-breakpoint
CREATE POLICY reporting_lines_tenant ON reporting_lines
  FOR ALL TO reviews_app
  USING (company_id = current_setting('app.company_id', true))
  WITH CHECK (company_id = current_setting('app.company_id', true));
--> statement-breakpoint
CREATE POLICY agent_tokens_tenant ON agent_tokens
  FOR ALL TO reviews_app
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.id = agent_tokens.membership_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.id = agent_tokens.membership_id
    )
  );
