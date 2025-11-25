-- =============================================================================
-- CleverBadge - Refresh Staging from Production
-- =============================================================================
--
-- This script copies all data from production schema to staging schema.
-- It performs a FULL REPLACE: truncates staging tables and copies production data.
--
-- IMPORTANT:
-- - Run this script as the 'cleverbadge_refresh' user
-- - All staging data will be DELETED and replaced with production data
-- - Foreign key constraints are handled by disabling triggers during copy
--
-- Usage:
--   PGPASSWORD=<refresh_pwd> psql -h <render-host> -U cleverbadge_refresh -d <dbname> -f refresh-staging.sql
--
-- =============================================================================

\echo ''
\echo '============================================================================='
\echo 'CleverBadge - Refreshing Staging from Production'
\echo '============================================================================='
\echo ''

-- Start transaction for atomicity
BEGIN;

\echo 'Step 1: Disabling triggers on staging tables...'

-- Disable triggers to avoid FK constraint issues during truncate/insert
ALTER TABLE staging.assessment_answers DISABLE TRIGGER ALL;
ALTER TABLE staging.assessments DISABLE TRIGGER ALL;
ALTER TABLE staging.test_questions DISABLE TRIGGER ALL;
ALTER TABLE staging.tests DISABLE TRIGGER ALL;
ALTER TABLE staging.questions DISABLE TRIGGER ALL;
ALTER TABLE staging.users DISABLE TRIGGER ALL;

\echo 'Step 2: Truncating staging tables...'

-- Truncate in reverse dependency order (children first)
TRUNCATE TABLE staging.assessment_answers;
TRUNCATE TABLE staging.assessments;
TRUNCATE TABLE staging.test_questions;
TRUNCATE TABLE staging.tests;
TRUNCATE TABLE staging.questions;
TRUNCATE TABLE staging.users;

\echo 'Step 3: Copying data from production to staging...'

-- Copy data in dependency order (parents first)

\echo '  - Copying users...'
INSERT INTO staging.users (id, username, password_hash, created_at, updated_at)
SELECT id, username, password_hash, created_at, updated_at
FROM production.users;

\echo '  - Copying questions...'
INSERT INTO staging.questions (id, text, type, options, correct_answers, tags, created_at, updated_at)
SELECT id, text, type, options, correct_answers, tags, created_at, updated_at
FROM production.questions;

\echo '  - Copying tests...'
INSERT INTO staging.tests (id, title, description, slug, is_enabled, pass_threshold, created_at, updated_at)
SELECT id, title, description, slug, is_enabled, pass_threshold, created_at, updated_at
FROM production.tests;

\echo '  - Copying test_questions...'
INSERT INTO staging.test_questions (id, test_id, question_id, weight)
SELECT id, test_id, question_id, weight
FROM production.test_questions;

\echo '  - Copying assessments...'
INSERT INTO staging.assessments (id, test_id, candidate_name, status, score_percentage, started_at, completed_at)
SELECT id, test_id, candidate_name, status, score_percentage, started_at, completed_at
FROM production.assessments;

\echo '  - Copying assessment_answers...'
INSERT INTO staging.assessment_answers (id, assessment_id, question_id, selected_options, is_correct, answered_at)
SELECT id, assessment_id, question_id, selected_options, is_correct, answered_at
FROM production.assessment_answers;

\echo 'Step 4: Re-enabling triggers on staging tables...'

-- Re-enable triggers
ALTER TABLE staging.users ENABLE TRIGGER ALL;
ALTER TABLE staging.questions ENABLE TRIGGER ALL;
ALTER TABLE staging.tests ENABLE TRIGGER ALL;
ALTER TABLE staging.test_questions ENABLE TRIGGER ALL;
ALTER TABLE staging.assessments ENABLE TRIGGER ALL;
ALTER TABLE staging.assessment_answers ENABLE TRIGGER ALL;

\echo 'Step 5: Verifying data counts...'

-- Verify row counts match
SELECT 'users' AS table_name,
       (SELECT COUNT(*) FROM production.users) AS production_count,
       (SELECT COUNT(*) FROM staging.users) AS staging_count,
       CASE WHEN (SELECT COUNT(*) FROM production.users) = (SELECT COUNT(*) FROM staging.users)
            THEN '✓ OK' ELSE '✗ MISMATCH' END AS status
UNION ALL
SELECT 'questions',
       (SELECT COUNT(*) FROM production.questions),
       (SELECT COUNT(*) FROM staging.questions),
       CASE WHEN (SELECT COUNT(*) FROM production.questions) = (SELECT COUNT(*) FROM staging.questions)
            THEN '✓ OK' ELSE '✗ MISMATCH' END
UNION ALL
SELECT 'tests',
       (SELECT COUNT(*) FROM production.tests),
       (SELECT COUNT(*) FROM staging.tests),
       CASE WHEN (SELECT COUNT(*) FROM production.tests) = (SELECT COUNT(*) FROM staging.tests)
            THEN '✓ OK' ELSE '✗ MISMATCH' END
UNION ALL
SELECT 'test_questions',
       (SELECT COUNT(*) FROM production.test_questions),
       (SELECT COUNT(*) FROM staging.test_questions),
       CASE WHEN (SELECT COUNT(*) FROM production.test_questions) = (SELECT COUNT(*) FROM staging.test_questions)
            THEN '✓ OK' ELSE '✗ MISMATCH' END
UNION ALL
SELECT 'assessments',
       (SELECT COUNT(*) FROM production.assessments),
       (SELECT COUNT(*) FROM staging.assessments),
       CASE WHEN (SELECT COUNT(*) FROM production.assessments) = (SELECT COUNT(*) FROM staging.assessments)
            THEN '✓ OK' ELSE '✗ MISMATCH' END
UNION ALL
SELECT 'assessment_answers',
       (SELECT COUNT(*) FROM production.assessment_answers),
       (SELECT COUNT(*) FROM staging.assessment_answers),
       CASE WHEN (SELECT COUNT(*) FROM production.assessment_answers) = (SELECT COUNT(*) FROM staging.assessment_answers)
            THEN '✓ OK' ELSE '✗ MISMATCH' END;

-- Commit the transaction
COMMIT;

\echo ''
\echo '============================================================================='
\echo 'Staging refresh complete!'
\echo '============================================================================='
\echo ''
