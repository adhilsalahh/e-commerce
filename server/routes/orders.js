import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../utils/email.js';

const router = express.Router();

// Create order
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      subtotal,
      tax,
      shipping,
      discount,
      total,
      couponCode
    } = req.body;

    if (!items || !items.length || !shippingAddress || !paymentMethod) {
      return res.status(400).json({ message: 'Missing required order information' });
    }

    // Generate order number
    const orderNumber = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Create order
    db.run(
      `INSERT INTO orders (userId, orderNumber, status, subtotal, tax, shipping, discount, total, paymentMethod, shippingAddress)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        orderNumber,
        'pending',
        subtotal,
        tax || 0,
        shipping || 0,
        discount || 0,
        total,
        paymentMethod,
        JSON.stringify(shippingAddress)
      ],
      function(err) {
        if (err) {
          console.error('Order creation error:', err);
          return res.status(500).json({ message: 'Failed to create order' });
        }

        const orderId = this.lastID;

        // Insert order items
        const insertPromises = items.map(item => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO order_items (orderId, productId, quantity, price, color, size) VALUES (?, ?, ?, ?, ?, ?)',
              [orderId, item.productId, item.quantity, item.price, item.color || null, item.size || null],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        });

        Promise.all(insertPromises)
          .then(() => {
            // Clear user's cart
            db.run('DELETE FROM cart_items WHERE userId = ?', [req.user.id]);

            // Update product stock
            items.forEach(item => {
              db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
            });

            // Send confirmation email
            sendOrderConfirmationEmail(req.user.email, req.user.name, orderNumber, items, total)
              .catch(err => console.error('Email sending failed:', err));

            res.status(201).json({
              message: 'Order created successfully',
              orderId,
              orderNumber
            });
          })
          .catch(err => {
            console.error('Order items error:', err);
            res.status(500).json({ message: 'Failed to create order items' });
          });
      }
    );
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Order creation failed' });
  }
});

// Get user orders
router.get('/', authenticateToken, (req, res) => {
  const query = `
    SELECT o.*, 
           GROUP_CONCAT(
             json_object(
               'productId', oi.productId,
               'quantity', oi.quantity,
               'price', oi.price,
               'color', oi.color,
               'size', oi.size,
               'title', p.title,
               'image', json_extract(p.images, '$[0]')
             )
           ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.orderId
    LEFT JOIN products p ON oi.productId = p.id
    WHERE o.userId = ?
    GROUP BY o.id
    ORDER BY o.createdAt DESC
  `;

  db.all(query, [req.user.id], (err, orders) => {
    if (err) {
      console.error('Orders fetch error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    const formattedOrders = orders.map(order => ({
      ...order,
      shippingAddress: JSON.parse(order.shippingAddress || '{}'),
      items: order.items ? order.items.split(',').map(item => JSON.parse(item)) : []
    }));

    res.json(formattedOrders);
  });
});

// Get single order
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT o.*, 
           GROUP_CONCAT(
             json_object(
               'productId', oi.productId,
               'quantity', oi.quantity,
               'price', oi.price,
               'color', oi.color,
               'size', oi.size,
               'title', p.title,
               'image', json_extract(p.images, '$[0]')
             )
           ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.orderId
    LEFT JOIN products p ON oi.productId = p.id
    WHERE o.id = ? AND o.userId = ?
    GROUP BY o.id
  `;

  db.get(query, [id, req.user.id], (err, order) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const formattedOrder = {
      ...order,
      shippingAddress: JSON.parse(order.shippingAddress || '{}'),
      items: order.items ? order.items.split(',').map(item => JSON.parse(item)) : []
    };

    res.json(formattedOrder);
  });
});

export default router;