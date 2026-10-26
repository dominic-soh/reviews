import { integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

export const ladders = pgTable('ladders', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
});

export const ladderVersions = pgTable('ladder_versions', {
  id: text('id').primaryKey(),
  ladderId: text('ladder_id')
    .notNull()
    .references(() => ladders.id),
  companyId: text('company_id').notNull(),
  state: text('state').notNull(),
});

export const levels = pgTable('levels', {
  id: text('id').primaryKey(),
  versionId: text('version_id')
    .notNull()
    .references(() => ladderVersions.id),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
  rank: integer('rank').notNull(),
});

export const criteria = pgTable('criteria', {
  id: text('id').primaryKey(),
  versionId: text('version_id')
    .notNull()
    .references(() => ladderVersions.id),
  companyId: text('company_id').notNull(),
  name: text('name').notNull(),
});

export const expectations = pgTable(
  'expectations',
  {
    id: text('id').primaryKey(),
    versionId: text('version_id')
      .notNull()
      .references(() => ladderVersions.id),
    levelId: text('level_id')
      .notNull()
      .references(() => levels.id),
    criterionId: text('criterion_id')
      .notNull()
      .references(() => criteria.id),
    companyId: text('company_id').notNull(),
    body: text('body').notNull(),
  },
  (table) => [
    uniqueIndex('expectations_version_level_criterion').on(
      table.versionId,
      table.levelId,
      table.criterionId,
    ),
  ],
);
