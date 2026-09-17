-- Add missing columns for custom schedule feature
ALTER TABLE users ADD COLUMN IF NOT EXISTS base_time TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS use_custom_schedule BOOLEAN DEFAULT FALSE;