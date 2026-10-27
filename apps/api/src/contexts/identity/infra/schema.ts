import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  personalEmail: text('personal_email').unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const memberships = pgTable(
  'memberships',
  {
    id: text('id').primaryKey(),
    companyId: text('company_id')
      .notNull()
      .references(() => companies.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('memberships_company_user').on(table.companyId, table.userId),
  ],
);

export const agentTokens = pgTable('agent_tokens', {
  token: text('token').primaryKey(),
  membershipId: text('membership_id')
    .notNull()
    .references(() => memberships.id),
});

export const personalSignIns = pgTable('personal_sign_ins', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
});

export const reportingLines = pgTable('reporting_lines', {
  membershipId: text('membership_id')
    .primaryKey()
    .references(() => memberships.id),
  managerMembershipId: text('manager_membership_id')
    .notNull()
    .references(() => memberships.id),
  companyId: text('company_id')
    .notNull()
    .references(() => companies.id),
});
