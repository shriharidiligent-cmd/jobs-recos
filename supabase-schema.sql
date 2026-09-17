-- ===============================================
-- JOB SEARCH SAAS - COMPLETE DATABASE SCHEMA
-- ===============================================
-- Last Updated: December 2024
-- This file contains the complete current schema
-- Always update this file when making database changes

-- ===============================================
-- USERS TABLE
-- ===============================================
-- Stores user accounts, authentication, and credit information

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  credits NUMERIC(10, 4) DEFAULT 100, -- Support decimal credits (up to 999999.9999)
  keywords TEXT[] DEFAULT '{}', -- User's saved search keywords
  scan_interval NUMERIC DEFAULT 2, -- Scan interval in hours (for custom schedules)
  base_time TEXT DEFAULT NULL, -- User's preferred starting time (e.g., "09:00")
  use_custom_schedule BOOLEAN DEFAULT FALSE, -- Enable custom schedule vs default times
  last_scan_at TIMESTAMP WITH TIME ZONE, -- Last automatic scan timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- SCAN RESULTS TABLE  
-- ===============================================
-- Stores results from automatic job scans

CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scan_time TIMESTAMP WITH TIME ZONE NOT NULL, -- When the scan was performed
  scan_hour INTEGER NOT NULL, -- Hour of scan (8, 12, 16, 20) for compatibility
  keywords TEXT NOT NULL, -- Keywords used in the scan
  job_data JSONB NOT NULL, -- Complete job data from scraping
  jobs_count INTEGER NOT NULL, -- Number of jobs found
  sources TEXT[] NOT NULL, -- Sources used ('linkedin', 'naukri')
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_last_scan ON users(last_scan_at);

-- Scan results table indexes  
CREATE INDEX IF NOT EXISTS idx_scan_results_user_id ON scan_results(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_time ON scan_results(scan_time);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_hour ON scan_results(scan_hour);
CREATE INDEX IF NOT EXISTS idx_scan_results_user_scan_time ON scan_results(user_id, scan_time DESC);

-- ===============================================
-- MIGRATIONS FOR EXISTING DATABASES
-- ===============================================
-- These commands safely update existing databases

-- Add columns if they don't exist (for existing databases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS base_time TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS use_custom_schedule BOOLEAN DEFAULT FALSE;

-- Update credits column to support decimal values (for existing databases)
-- This will convert existing INTEGER credits to NUMERIC
DO $$
BEGIN
  -- Check if credits column is still INTEGER type
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'credits') = 'integer' THEN
    
    -- Alter the column type to NUMERIC
    ALTER TABLE users ALTER COLUMN credits TYPE NUMERIC(10, 4);
    
    -- Log the change
    RAISE NOTICE 'Credits column updated from INTEGER to NUMERIC(10, 4)';
  END IF;
END $$;

-- ===============================================
-- SCHEMA INFORMATION
-- ===============================================

-- Current Schema Version: 2.0
-- Changes from v1.0:
-- - Added base_time and use_custom_schedule columns for custom scan scheduling
-- - Updated credits from INTEGER to NUMERIC(10,4) for per-job pricing
-- - Added comprehensive indexing for performance
-- - Added scan_results table for automatic scan storage

-- Credit System:
-- - Users start with 100 credits (configurable via DEFAULT_CREDITS env var)
-- - Cost: 0.0667 credits per job delivered (configurable via CREDITS_PER_JOB env var)
-- - Minimum purchase: 50 credits (configurable via MIN_CREDIT_PURCHASE env var)

-- Scan System:
-- - Default scans: 08:00, 12:00, 16:00, 20:00 (configurable via SCAN_TIMES env var)
-- - Custom scans: User-defined base_time and interval
-- - All scan results stored in scan_results table with full job data