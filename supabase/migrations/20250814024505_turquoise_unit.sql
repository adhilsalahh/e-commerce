/*
  # Create users table with email verification

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `name` (text, user's full name)
      - `email` (text, unique, user's email address)
      - `password` (text, hashed password)
      - `phone` (text, optional phone number)
      - `role` (text, user role - 'user' or 'admin')
      - `is_verified` (boolean, email verification status)
      - `verification_token` (text, email verification token)
      - `reset_password_token` (text, password reset token)
      - `reset_password_expires` (timestamptz, password reset expiry)
      - `created_at` (timestamptz, account creation time)
      - `updated_at` (timestamptz, last update time)

  2. Security
    - Enable RLS on `users` table
    - Add policy for users to read their own data
    - Add policy for users to update their own data
    - Add policy for admins to read all users

  3. Indexes
    - Index on email for fast lookups
    - Index on verification_token for email verification
    - Index on reset_password_token for password resets
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  phone text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_verified boolean DEFAULT false,
  verification_token text,
  reset_password_token text,
  reset_password_expires timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token);

-- RLS Policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();