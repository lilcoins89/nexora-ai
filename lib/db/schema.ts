import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const nexoraProjects = pgTable('nexora_projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  mode: text('mode').notNull().default('build'),
  selectedFile: text('selected_file'),
  files: jsonb('files').$type<Record<string, string>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const nexoraRuns = pgTable('nexora_runs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  projectId: text('project_id'),
  prompt: text('prompt').notNull(),
  mode: text('mode').notNull(),
  status: text('status').notNull().default('queued'),
  events: jsonb('events').$type<string[]>().notNull().default([]),
  result: jsonb('result').$type<Record<string, unknown>>(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const dbSchema = { nexoraProjects, nexoraRuns }
