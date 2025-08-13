import express from 'express';
import db from '../config/database.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Validate coupon (public route)
router.post('/validate', (req, res) => {
  const { code, amount } = req.body;

  if (!code) {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  db.get(
    `SELECT * FROM coupons 
     WHERE code = ? AND isActive = 1 
     AND (expiresAt IS NULL OR expiresAt > datetime('now'))
     AND (usageLimit IS NULL OR usedCount < usageLimit)`,
    [code],
    (err, coupon) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (!coupon) {
        return res.status(404).json({ message: 'Invalid or expired coupon code' });
      }

      // Check minimum amount
      if (coupon.minAmount > 0 && amount < coupon.minAmount) {
        return res.status(400).json({ 
          message: `Minimum order amount of $${coupon.minAmount} required for this coupon`
        });
      }

      // Calculate discount
      let discount = 0;
      if (coupon.type === 'percentage') {
        discount = (amount * coupon.value) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.value;
      }

      res.json({
        valid: true,
        discount: parseFloat(discount.toFixed(2)),
        type: coupon.type,
        value: coupon.value
      });
    }
  );
});

// Admin routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get all coupons
router.get('/', (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  db.get('SELECT COUNT(*) as total FROM coupons', (err, countResult) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    db.all(
      'SELECT * FROM coupons ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [parseInt(limit), offset],
      (err, coupons) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        res.json({
          coupons,
          totalPages: Math.ceil(countResult.total / parseInt(limit)),
          currentPage: parseInt(page),
          totalItems: countResult.total
        });
      }
    );
  });
});

// Create coupon
router.post('/', (req, res) => {
  const {
    code,
    type,
    value,
    minAmount,
    maxDiscount,
    usageLimit,
    expiresAt
  } = req.body;

  if (!code || !type || !value) {
    return res.status(400).json({ message: 'Code, type, and value are required' });
  }

  if (!['percentage', 'fixed'].includes(type)) {
    return res.status(400).json({ message: 'Type must be either percentage or fixed' });
  }

  db.run(
    `INSERT INTO coupons (code, type, value, minAmount, maxDiscount, usageLimit, expiresAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      code.toUpperCase(),
      type,
      value,
      minAmount || 0,
      maxDiscount || null,
      usageLimit || null,
      expiresAt || null
    ],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ message: 'Coupon code already exists' });
        }
        return res.status(500).json({ message: 'Failed to create coupon' });
      }

      res.status(201).json({ message: 'Coupon created successfully', couponId: this.lastID });
    }
  );
});

// Update coupon
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    code,
    type,
    value,
    minAmount,
    maxDiscount,
    usageLimit,
    isActive,
    expiresAt
  } = req.body;

  db.run(
    `UPDATE coupons SET 
     code = ?, type = ?, value = ?, minAmount = ?, maxDiscount = ?, 
     usageLimit = ?, isActive = ?, expiresAt = ?, updatedAt = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      code?.toUpperCase(),
      type,
      value,
      minAmount || 0,
      maxDiscount || null,
      usageLimit || null,
      isActive ? 1 : 0,
      expiresAt || null,
      id
    ],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          return res.status(400).json({ message: 'Coupon code already exists' });
        }
        return res.status(500).json({ message: 'Failed to update coupon' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ message: 'Coupon not found' });
      }

      res.json({ message: 'Coupon updated successfully' });
    }
  );
});

// Delete coupon
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM coupons WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete coupon' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json({ message: 'Coupon deleted successfully' });
  });
});

export default router;