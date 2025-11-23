import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, json, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const questionTypeEnum = pgEnum('question_type', ['SINGLE', 'MULTIPLE']);
export const assessmentStatusEnum = pgEnum('assessment_status', ['STARTED', 'COMPLETED']);

// Users table (for Phase 2)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Questions table
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  text: text('text').notNull(),
  type: questionTypeEnum('type').notNull(),
  options: json('options').$type().notNull(),
  correct_answers: json('correct_answers').$type().notNull(),
  tags: json('tags').$type(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Tests table
export const tests = pgTable('tests', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  is_enabled: boolean('is_enabled').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Test Questions junction table
export const testQuestions = pgTable('test_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  test_id: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  question_id: uuid('question_id').references(() => questions.id, { onDelete: 'restrict' }).notNull(),
  weight: integer('weight').default(1).notNull()
});

// Assessments table
export const assessments = pgTable('assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  test_id: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
  candidate_name: varchar('candidate_name', { length: 100 }).notNull(),
  status: assessmentStatusEnum('status').default('STARTED').notNull(),
  score_percentage: decimal('score_percentage', { precision: 5, scale: 2 }),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at')
});

// Assessment Answers table
export const assessmentAnswers = pgTable('assessment_answers', {
  id: uuid('id').defaultRandom().primaryKey(),
  assessment_id: uuid('assessment_id').references(() => assessments.id, { onDelete: 'cascade' }).notNull(),
  question_id: uuid('question_id').references(() => questions.id, { onDelete: 'restrict' }).notNull(),
  selected_options: json('selected_options').$type().notNull(),
  is_correct: boolean('is_correct'),
  answered_at: timestamp('answered_at').defaultNow().notNull()
});
