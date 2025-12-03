-- Migration: Create email_tokens table for verification and password reset

-- ===========================================
-- ENUM TYPES
-- ===========================================

-- Email token type
DO $$ BEGIN
  CREATE TYPE __SCHEMA__.email_token_type AS ENUM ('verification', 'password_reset');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ===========================================
-- EMAIL TOKENS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS __SCHEMA__.email_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES __SCHEMA__.users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  type __SCHEMA__.email_token_type NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_tokens_token ON __SCHEMA__.email_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON __SCHEMA__.email_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON __SCHEMA__.email_tokens(expires_at);
