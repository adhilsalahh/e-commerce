import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ecommerce.db');
const db = new sqlite3.Database(dbPath);

export const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          phone TEXT,
          role TEXT DEFAULT 'user',
          isVerified INTEGER DEFAULT 0,
          verificationToken TEXT,
          resetPasswordToken TEXT,
          resetPasswordExpires INTEGER,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User addresses table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_addresses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          street TEXT NOT NULL,
          city TEXT NOT NULL,
          state TEXT NOT NULL,
          zipCode TEXT NOT NULL,
          country TEXT DEFAULT 'US',
          isDefault INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Categories table
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          image TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          discountPrice DECIMAL(10,2),
          stock INTEGER DEFAULT 0,
          categoryId INTEGER,
          images TEXT,
          colors TEXT,
          sizes TEXT,
          featured INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (categoryId) REFERENCES categories (id)
        )
      `);

      // Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          orderNumber TEXT UNIQUE NOT NULL,
          status TEXT DEFAULT 'pending',
          subtotal DECIMAL(10,2) NOT NULL,
          tax DECIMAL(10,2) DEFAULT 0,
          shipping DECIMAL(10,2) DEFAULT 0,
          discount DECIMAL(10,2) DEFAULT 0,
          total DECIMAL(10,2) NOT NULL,
          paymentMethod TEXT NOT NULL,
          paymentStatus TEXT DEFAULT 'pending',
          shippingAddress TEXT NOT NULL,
          trackingNumber TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id)
        )
      `);

      // Order items table
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          orderId INTEGER NOT NULL,
          productId INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          color TEXT,
          size TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (orderId) REFERENCES orders (id) ON DELETE CASCADE,
          FOREIGN KEY (productId) REFERENCES products (id)
        )
      `);

      // Coupons table
      db.run(`
        CREATE TABLE IF NOT EXISTS coupons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL,
          value DECIMAL(10,2) NOT NULL,
          minAmount DECIMAL(10,2) DEFAULT 0,
          maxDiscount DECIMAL(10,2),
          usageLimit INTEGER,
          usedCount INTEGER DEFAULT 0,
          isActive INTEGER DEFAULT 1,
          expiresAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Cart items table (for persistent cart)
      db.run(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          productId INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          color TEXT,
          size TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE,
          UNIQUE(userId, productId, color, size)
        )
      `);

      // Wishlist table
      db.run(`
        CREATE TABLE IF NOT EXISTS wishlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          productId INTEGER NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
          FOREIGN KEY (productId) REFERENCES products (id) ON DELETE CASCADE,
          UNIQUE(userId, productId)
        )
      `);

      // Insert default admin user
      db.run(`
        INSERT OR IGNORE INTO users (name, email, password, role, isVerified) 
        VALUES (?, ?, ?, ?, ?)
      `, ['Admin', 'admin@ecommerce.com', '$2b$10$rQK8tXPzzzKr2QaK8Y0C/ONQYa.rjZD7Xh5f8L6Y3n9KhF9oL2C4i', 'admin', 1]);

      // Insert sample categories
      const categories = [
        ['Electronics', 'Latest gadgets and electronic devices'],
        ['Clothing', 'Fashion and apparel for all'],
        ['Home & Garden', 'Home improvement and garden supplies'],
        ['Sports', 'Sports equipment and fitness gear']
      ];

      categories.forEach(category => {
        db.run(`INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)`, category);
      });

      // Insert sample products
      const sampleProducts = [
        {
          title: 'Premium Wireless Headphones',
          description: 'High-quality wireless headphones with noise cancellation and premium sound quality.',
          price: 299.99,
          discountPrice: 249.99,
          stock: 50,
          categoryId: 1,
          images: JSON.stringify(['https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg']),
          colors: JSON.stringify(['Black', 'White', 'Blue']),
          featured: 1
        },
        {
          title: 'Smart Watch Series X',
          description: 'Advanced smartwatch with health monitoring, GPS, and long battery life.',
          price: 399.99,
          discountPrice: 349.99,
          stock: 30,
          categoryId: 1,
          images: JSON.stringify(['https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg']),
          colors: JSON.stringify(['Black', 'Silver', 'Gold']),
          featured: 1
        },
        {
          title: 'Designer Cotton T-Shirt',
          description: 'Premium cotton t-shirt with modern design and comfortable fit.',
          price: 49.99,
          stock: 100,
          categoryId: 2,
          images: JSON.stringify(['https://images.pexels.com/photos/1020585/pexels-photo-1020585.jpeg']),
          colors: JSON.stringify(['White', 'Black', 'Gray', 'Navy']),
          sizes: JSON.stringify(['XS', 'S', 'M', 'L', 'XL']),
          featured: 1
        }
      ];

      sampleProducts.forEach(product => {
        db.run(`
          INSERT OR IGNORE INTO products 
          (title, description, price, discountPrice, stock, categoryId, images, colors, sizes, featured) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product.title, product.description, product.price, product.discountPrice || null,
          product.stock, product.categoryId, product.images, product.colors,
          product.sizes || null, product.featured
        ]);
      });

      resolve();
    });
  });
};

export default db;