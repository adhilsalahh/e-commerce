/*
  # Create user addresses table

  1. New Tables
    - `user_addresses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `name` (text, address name/label)
      - `street` (text, street address)
      - `city` (text, city)
      - `state` (text, state/province)
      - `zip_code` (text, postal code)
      - `country` (text, country code)
      - `is_default` (boolean, default address flag)
      - `created_at` (timestamptz, creation time)

  2. Security
    - Enable RLS on `user_addresses` table
    - Add policy for users to manage their own addresses
*/

CREATE TABLE IF NOT EXISTS user_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  country text DEFAULT 'US',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

-- RLS Policies
CREATE POLICY "Users can manage own addresses"
  ON user_addresses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());