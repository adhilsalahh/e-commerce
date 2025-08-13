import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, name, email, phone FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user addresses
    db.all('SELECT * FROM user_addresses WHERE userId = ? ORDER BY isDefault DESC, createdAt DESC', [req.user.id], (err, addresses) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      res.json({ ...user, addresses });
    });
  });
});

// Update user profile
router.put('/profile', authenticateToken, (req, res) => {
  const { name, phone } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  db.run(
    'UPDATE users SET name = ?, phone = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
    [name, phone || null, req.user.id],
    (err) => {
      if (err) {
        return res.status(500).json({ message: 'Update failed' });
      }

      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Both current and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], async (err, user) => {
    if (err || !user) {
      return res.status(500).json({ message: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Password update failed' });
      }

      res.json({ message: 'Password changed successfully' });
    });
  });
});

// Add address
router.post('/addresses', authenticateToken, (req, res) => {
  const { name, street, city, state, zipCode, country = 'US', isDefault = false } = req.body;

  if (!name || !street || !city || !state || !zipCode) {
    return res.status(400).json({ message: 'All address fields are required' });
  }

  // If this is set as default, unset other defaults first
  if (isDefault) {
    db.run('UPDATE user_addresses SET isDefault = 0 WHERE userId = ?', [req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      insertAddress();
    });
  } else {
    insertAddress();
  }

  function insertAddress() {
    db.run(
      'INSERT INTO user_addresses (userId, name, street, city, state, zipCode, country, isDefault) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, name, street, city, state, zipCode, country, isDefault ? 1 : 0],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Failed to add address' });
        }

        res.status(201).json({ message: 'Address added successfully', addressId: this.lastID });
      }
    );
  }
});

// Update address
router.put('/addresses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, street, city, state, zipCode, country = 'US', isDefault = false } = req.body;

  if (!name || !street || !city || !state || !zipCode) {
    return res.status(400).json({ message: 'All address fields are required' });
  }

  // Check if address belongs to user
  db.get('SELECT id FROM user_addresses WHERE id = ? AND userId = ?', [id, req.user.id], (err, address) => {
    if (err || !address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If this is set as default, unset other defaults first
    if (isDefault) {
      db.run('UPDATE user_addresses SET isDefault = 0 WHERE userId = ?', [req.user.id], (err) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        updateAddress();
      });
    } else {
      updateAddress();
    }

    function updateAddress() {
      db.run(
        'UPDATE user_addresses SET name = ?, street = ?, city = ?, state = ?, zipCode = ?, country = ?, isDefault = ? WHERE id = ?',
        [name, street, city, state, zipCode, country, isDefault ? 1 : 0, id],
        (err) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to update address' });
          }

          res.json({ message: 'Address updated successfully' });
        }
      );
    }
  });
});

// Delete address
router.delete('/addresses/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM user_addresses WHERE id = ? AND userId = ?', [id, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to delete address' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });
  });
});

// Cart operations
router.get('/cart', authenticateToken, (req, res) => {
  const query = `
    SELECT ci.*, p.title, p.price, p.discountPrice, p.stock, 
           json_extract(p.images, '$[0]') as image
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
    WHERE ci.userId = ?
    ORDER BY ci.createdAt DESC
  `;

  db.all(query, [req.user.id], (err, items) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(items);
  });
});

router.post('/cart', authenticateToken, (req, res) => {
  const { productId, quantity = 1, color, size } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  // Check if product exists and has stock
  db.get('SELECT stock FROM products WHERE id = ? AND status = "active"', [productId], (err, product) => {
    if (err || !product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Check if item already exists in cart
    db.get(
      'SELECT * FROM cart_items WHERE userId = ? AND productId = ? AND color = ? AND size = ?',
      [req.user.id, productId, color || null, size || null],
      (err, existingItem) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }

        if (existingItem) {
          // Update quantity
          const newQuantity = existingItem.quantity + quantity;
          if (product.stock < newQuantity) {
            return res.status(400).json({ message: 'Insufficient stock' });
          }

          db.run(
            'UPDATE cart_items SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
            [newQuantity, existingItem.id],
            (err) => {
              if (err) {
                return res.status(500).json({ message: 'Failed to update cart' });
              }

              res.json({ message: 'Cart updated successfully' });
            }
          );
        } else {
          // Add new item
          db.run(
            'INSERT INTO cart_items (userId, productId, quantity, color, size) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, productId, quantity, color || null, size || null],
            (err) => {
              if (err) {
                return res.status(500).json({ message: 'Failed to add to cart' });
              }

              res.status(201).json({ message: 'Item added to cart successfully' });
            }
          );
        }
      }
    );
  });
});

router.put('/cart/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.status(400).json({ message: 'Valid quantity is required' });
  }

  // Check if cart item belongs to user and get product stock
  const query = `
    SELECT ci.*, p.stock 
    FROM cart_items ci
    JOIN products p ON ci.productId = p.id
    WHERE ci.id = ? AND ci.userId = ?
  `;

  db.get(query, [id, req.user.id], (err, item) => {
    if (err || !item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    if (item.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    db.run(
      'UPDATE cart_items SET quantity = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [quantity, id],
      (err) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to update cart' });
        }

        res.json({ message: 'Cart updated successfully' });
      }
    );
  });
});

router.delete('/cart/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM cart_items WHERE id = ? AND userId = ?', [id, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to remove item' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.json({ message: 'Item removed from cart successfully' });
  });
});

// Wishlist operations
router.get('/wishlist', authenticateToken, (req, res) => {
  const query = `
    SELECT w.*, p.title, p.price, p.discountPrice,
           json_extract(p.images, '$[0]') as image
    FROM wishlist w
    JOIN products p ON w.productId = p.id
    WHERE w.userId = ?
    ORDER BY w.createdAt DESC
  `;

  db.all(query, [req.user.id], (err, items) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    res.json(items);
  });
});

router.post('/wishlist', authenticateToken, (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  db.run(
    'INSERT OR IGNORE INTO wishlist (userId, productId) VALUES (?, ?)',
    [req.user.id, productId],
    (err) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to add to wishlist' });
      }

      res.status(201).json({ message: 'Item added to wishlist successfully' });
    }
  );
});

router.delete('/wishlist/:productId', authenticateToken, (req, res) => {
  const { productId } = req.params;

  db.run('DELETE FROM wishlist WHERE userId = ? AND productId = ?', [req.user.id, productId], function(err) {
    if (err) {
      return res.status(500).json({ message: 'Failed to remove item' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: 'Wishlist item not found' });
    }

    res.json({ message: 'Item removed from wishlist successfully' });
  });
});

export default router;