-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AUTHOR');

-- Step 1: Create a system user to own existing data
-- First, add new fields to User table
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'AUTHOR';
ALTER TABLE "User" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Insert a system user if none exists (for existing data migration)
INSERT INTO "User" (id, username, password_hash, role, created_at)
SELECT
  '00000000-0000-0000-0000-000000000000',
  'system',
  '',
  'ADMIN',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "User");

-- Step 3: Add created_by to Question table (nullable first)
ALTER TABLE "Question" ADD COLUMN "created_by" TEXT;

-- Step 4: Set existing questions to be owned by the system user
UPDATE "Question"
SET "created_by" = '00000000-0000-0000-0000-000000000000'
WHERE "created_by" IS NULL;

-- Step 5: Make created_by required
ALTER TABLE "Question" ALTER COLUMN "created_by" SET NOT NULL;

-- Step 6: Add created_by to Test table (nullable first)
ALTER TABLE "Test" ADD COLUMN "created_by" TEXT;

-- Step 7: Set existing tests to be owned by the system user
UPDATE "Test"
SET "created_by" = '00000000-0000-0000-0000-000000000000'
WHERE "created_by" IS NULL;

-- Step 8: Make created_by required
ALTER TABLE "Test" ALTER COLUMN "created_by" SET NOT NULL;

-- Step 9: Make candidate_name required in Assessment
-- First check if there are any null values and update them
UPDATE "Assessment"
SET "candidate_name" = 'Unknown Candidate'
WHERE "candidate_name" IS NULL;

-- Then make it NOT NULL
ALTER TABLE "Assessment" ALTER COLUMN "candidate_name" SET NOT NULL;

-- Step 10: Add foreign key constraints
ALTER TABLE "Question" ADD CONSTRAINT "Question_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Test" ADD CONSTRAINT "Test_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
