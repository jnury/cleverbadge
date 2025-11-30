-- Migration: Add ABANDONED status to assessment_status enum
-- This status is used when assessments expire due to timeout

ALTER TYPE __SCHEMA__.assessment_status ADD VALUE IF NOT EXISTS 'ABANDONED';
