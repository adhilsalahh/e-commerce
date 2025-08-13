import express from 'express';
import db from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendOrderStatusUpdateEmail } from '../utils/email.js';

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Dashboard stats
router.get('/dashboard', (req, res) => {
  const stats = {};

  // Get total orders
  db.get('SELECT COUNT(*) as total FROM orders', (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    stats.totalOrders = result.total;

    // Get total revenue
    db.get('SELECT SUM(total) as revenue FROM orders WHERE status != "cancelled"', (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      stats.totalRevenue = result.revenue || 0;

      // Get total users
      db.get('SELECT COUNT(*) as total FROM users WHERE role = "user"', (err, result) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }
        stats.totalUsers = result.total;

        // Get pending orders
        db.get('SELECT COUNT(*) as total FROM orders WHERE status = "pending"', (err, result) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }
          stats.pendingOrders = result.total;

          // Get recent orders
          const recentOrdersQuery = `
            SELECT o.*, u.name as userName, u.email as userEmail
            FROM orders o
            JOIN users u ON o.userId = u.id
            ORDER BY o.createdAt DESC
            LIMIT 5
          `;

          db.all(recentOrdersQuery, (err, recentOrders) => {
            if (err) {
              return res.status(500).json({ message: 'Database error' });
            }

            stats.recentOrders = recentOrders;
            res.json(stats);
          });
        });
      });
    });
  });
});

// Product Management
router.get('/products', (req, res) => {
  const { page = 1, limit = 10, search, category } = req.query;

  let query = `
    SELECT p.*, c.name as categoryName 
    FROM products p 
    LEFT JOIN categories c ON p.categoryId = c.id
    WHERE 1=1
  `;
  let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
  const params = [];
  const countParams = [];

  if (search) {
    query += ' AND p.title LIKE ?';
    countQuery += ' AND title LIKE ?';
    params.push(`%${search}%`);
    countParams.push(`%${search}%`);
  }

  if (category) {
    query += ' AND c.name = ?';
    countQuery += ' AND categoryId = (SELECT id FROM categories WHERE name = ?)';
    params.push(category);
    countParams.push(category);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.get(countQuery, countParams, (err, countResult) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    db.all(query, params, (err, products) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      const formattedProducts = products.map(product => ({
        ...product,
        images: JSON.parse(product.images || '[]'),
        colors: JSON.parse(product.colors || '[]'),
        sizes: JSON.parse(product.sizes || '[]')
      }));

      res.json({
        products: formattedProducts,
        totalPages: Math.ceil(countResult.total / parseInt(limit)),
        currentPage: parseInt(page),
        totalItems: countResult.total
      });
    });
  });
});

router.post('/products', (req, res) => {
  const {
    title,
    description,
    price,
    discountPrice,
    stock,
    categoryId,
    images,
    colors,
    sizes,
    featured
  } = req.body;

  if (!title || !price || !categoryId) {
    return res.status(400).json({ message: 'Title, price, and category are required' });
  }

  db.run(
    `INSERT INTO products (title, description, price, discountPrice, stock, categoryId, images, colors, sizes, featured, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      title,
      description || null,
      price,
      discountPrice || null,
      stock || 0,
      categoryId,
      JSON.stringify(images || []),
      JSON.stringify(colors || []),
      JSON.stringify(sizes || []),
      featured ? 1 : 0
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to create product' });
      }

      res.status(201).json({ message: 'Product created successfully', productId: this.lastID });
    }
  );
});

router.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    price,
    discountPrice,
    stock,
    categoryId,
    images,
    colors,
    sizes,
    featured,
    status
  } = req.body;

  db.run(
    `UPDATE products SET 
     title = ?, description = ?, price = ?, discountPrice = ?, stock = ?, 
     categoryId = ?, images = ?, colors = ?, sizes = ?, featured = ?, status = ?,
     updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title,
      description || null,
      price,
      discountPrice || null,
      stock || 0,
      categoryId,
      JSON.stringify(images || []),
      JSON.stringify(colors || []),
      JSON.stringify(sizes || []),
      featured ? 1 : 0,
      status || 'active',
      id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to update product' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({ message: 'Product updated successfully' });
    }
  );
});

router.delete('/products/:id', (req, res) => {
  const { id } = req.params;

  db.run('UPDATE products SET status = "deleted" WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete product' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  });
});

// Order Management
router.get('/orders', (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;

  let query = `
    SELECT o.*, u.name as userName, u.email as userEmail,
           COUNT(oi.id) as itemCount
    FROM orders o
    JOIN users u ON o.userId = u.id
    LEFT JOIN order_items oi ON o.id = oi.orderId
    WHERE 1=1
  `;
  let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
  const params = [];
  const countParams = [];

  if (status) {
    query += ' AND o.status = ?';
    countQuery += ' AND status = ?';
    params.push(status);
    countParams.push(status);
  }

  if (search) {
    query += ' AND (o.orderNumber LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
    countQuery += ' AND (orderNumber LIKE ? OR userId IN (SELECT id FROM users WHERE name LIKE ? OR email LIKE ?))';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm, searchTerm);
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ' GROUP BY o.id ORDER BY o.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  db.get(countQuery, countParams, (err, countResult) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    db.all(query, params, (err, orders) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      const formattedOrders = orders.map(order => ({
        ...order,
        shippingAddress: JSON.parse(order.shippingAddress || '{}')
      }));

      res.json({
        orders: formattedOrders,
        totalPages: Math.ceil(countResult.total / parseInt(limit)),
        currentPage: parseInt(page),
        totalItems: countResult.total
      });
    });
  });
});

router.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body;

  const validStatuses = ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // Get order and user details for email
  db.get(
    'SELECT o.*, u.name, u.email FROM orders o JOIN users u ON o.userId = u.id WHERE o.id = ?',
    [id],
    (err, order) => {
      if (err || !order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // Update order status
      db.run(
        'UPDATE orders SET status = ?, trackingNumber = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [status, trackingNumber || null, id],
        async (err) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to update order status' });
          }

          // Send status update email
          try {
            await sendOrderStatusUpdateEmail(order.email, order.name, order.orderNumber, status, trackingNumber);
          } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
          }

          res.json({ message: 'Order status updated successfully' });
        }
      );
    }
  );
});

// Category Management
router.get('/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name ASC', (err, categories) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(categories);
  });
});

router.post('/categories', (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  db.run(
    'INSERT INTO categories (name, description) VALUES (?, ?)',
    [name, description || null],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ message: 'Category name already exists' });
        }
        return res.status(500).json({ message: 'Failed to create category' });
      }

      res.status(201).json({ message: 'Category created successfully', categoryId: this.lastID });
    }
  );
});

router.put('/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  db.run(
    'UPDATE categories SET name = ?, description = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
    [name, description || null, id],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ message: 'Category name already exists' });
        }
        return res.status(500).json({ message: 'Failed to update category' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category updated successfully' });
    }
  );
});

router.delete('/categories/:id', (req, res) => {
  const { id } = req.params;

  // Check if category has products
  db.get('SELECT COUNT(*) as count FROM products WHERE categoryId = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (result.count > 0) {
      return res.status(400).json({ message: 'Cannot delete category with existing products' });
    }

    db.run('DELETE FROM categories WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to delete category' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category deleted successfully' });
    });
  });
});

export default router;