/*
  # Create products table

  1. New Tables
    - `products`
      - `id` (uuid, primary key)
      - `title` (text, product title)
      - `description` (text, product description)
      - `price` (decimal, product price)
      - `discount_price` (decimal, discounted price)
      - `stock` (integer, available quantity)
      - `category_id` (uuid, foreign key to categories)
      - `images` (jsonb, array of image URLs)
      - `colors` (jsonb, array of available colors)
      - `sizes` (jsonb, array of available sizes)
      - `featured` (boolean, featured product flag)
      - `status` (text, product status)
      - `created_at` (timestamptz, creation time)
      - `updated_at` (timestamptz, last update time)

  2. Security
    - Enable RLS on `products` table
    - Add policy for public read access to active products
    - Add policy for admin write access

  3. Sample Data
    - Insert sample products
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  discount_price decimal(10,2),
  stock integer DEFAULT 0,
  category_id uuid REFERENCES categories(id),
  images jsonb DEFAULT '[]'::jsonb,
  colors jsonb DEFAULT '[]'::jsonb,
  sizes jsonb DEFAULT '[]'::jsonb,
  featured boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);

-- RLS Policies
CREATE POLICY "Active products are viewable by everyone"
  ON products
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger to automatically update updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();