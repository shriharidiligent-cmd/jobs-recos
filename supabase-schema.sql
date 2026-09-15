-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  credits INTEGER DEFAULT 100,
  keywords TEXT[] DEFAULT '{}',
  scan_interval NUMERIC DEFAULT 2,
  last_scan_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on last_scan_at for scheduler queries
CREATE INDEX IF NOT EXISTS idx_users_last_scan ON users(last_scan_at);
