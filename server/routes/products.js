import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Get all products with filters
router.get('/', (req, res) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort = 'createdAt',
    order = 'DESC',
    page = 1,
    limit = 12,
    featured
  } = req.query;

  let query = `
    SELECT p.*, c.name as categoryName 
    FROM products p 
    LEFT JOIN categories c ON p.categoryId = c.id 
    WHERE p.status = 'active'
  `;
  let countQuery = `SELECT COUNT(*) as total FROM products p WHERE p.status = 'active'`;
  const params = [];
  const countParams = [];

  // Apply filters
  if (category) {
    query += ' AND c.name = ?';
    countQuery += ' AND p.categoryId = (SELECT id FROM categories WHERE name = ?)';
    params.push(category);
    countParams.push(category);
  }

  if (search) {
    query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    countQuery += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm);
  }

  if (minPrice) {
    query += ' AND p.price >= ?';
    countQuery += ' AND p.price >= ?';
    params.push(parseFloat(minPrice));
    countParams.push(parseFloat(minPrice));
  }

  if (maxPrice) {
    query += ' AND p.price <= ?';
    countQuery += ' AND p.price <= ?';
    params.push(parseFloat(maxPrice));
    countParams.push(parseFloat(maxPrice));
  }

  if (featured === 'true') {
    query += ' AND p.featured = 1';
    countQuery += ' AND p.featured = 1';
  }

  // Add sorting
  const validSortFields = ['price', 'createdAt', 'title'];
  const sortField = validSortFields.includes(sort) ? sort : 'createdAt';
  const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY p.${sortField} ${sortOrder}`;

  // Add pagination
  const offset = (parseInt(page) - 1) * parseInt(limit);
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  // Get total count
  db.get(countQuery, countParams, (err, countResult) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    // Get products
    db.all(query, params, (err, products) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      // Parse JSON fields
      const formattedProducts = products.map(product => ({
        ...product,
        images: JSON.parse(product.images || '[]'),
        colors: JSON.parse(product.colors || '[]'),
        sizes: JSON.parse(product.sizes || '[]')
      }));

      const totalPages = Math.ceil(countResult.total / parseInt(limit));

      res.json({
        products: formattedProducts,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: countResult.total,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      });
    });
  });
});

// Get single product
router.get('/:id', (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT p.*, c.name as categoryName 
     FROM products p 
     LEFT JOIN categories c ON p.categoryId = c.id 
     WHERE p.id = ? AND p.status = 'active'`,
    [id],
    (err, product) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Parse JSON fields
      const formattedProduct = {
        ...product,
        images: JSON.parse(product.images || '[]'),
        colors: JSON.parse(product.colors || '[]'),
        sizes: JSON.parse(product.sizes || '[]')
      };

      res.json(formattedProduct);
    }
  );
});

// Get categories
router.get('/categories/all', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name ASC', (err, categories) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(categories);
  });
});

export default router;