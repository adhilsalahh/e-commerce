import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../config/database.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }

      if (user) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password and create verification token
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Insert user
      db.run(
        'INSERT INTO users (name, email, password, verificationToken) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, verificationToken],
        async function(err) {
          if (err) {
            return res.status(500).json({ message: 'Failed to create user' });
          }

          // Send verification email
          try {
            await sendVerificationEmail(email, name, verificationToken);
            res.status(201).json({
              message: 'Registration successful! Please check your email to verify your account.',
              userId: this.lastID
            });
          } catch (emailErr) {
            console.error('Email sending failed:', emailErr);
            res.status(201).json({
              message: 'Registration successful! Email verification temporarily unavailable.',
              userId: this.lastID
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Verify email
router.get('/verify/:token', (req, res) => {
  const { token } = req.params;

  db.get('SELECT id, email FROM users WHERE verificationToken = ?', [token], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ message: 'Invalid verification token' });
    }

    db.run(
      'UPDATE users SET isVerified = 1, verificationToken = NULL WHERE id = ?',
      [user.id],
      (err) => {
        if (err) {
          return res.status(500).json({ message: 'Verification failed' });
        }

        res.json({ message: 'Email verified successfully! You can now log in.' });
      }
    );
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email before logging in' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  });
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  db.get('SELECT * FROM users WHERE email = ? AND isVerified = 1', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    if (!user) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If your email is registered, you will receive a password reset link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 3600000; // 1 hour

    db.run(
      'UPDATE users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?',
      [resetToken, resetExpires, user.id],
      async (err) => {
        if (err) {
          return res.status(500).json({ message: 'Failed to generate reset token' });
        }

        try {
          await sendPasswordResetEmail(email, user.name, resetToken);
          res.json({ message: 'If your email is registered, you will receive a password reset link.' });
        } catch (emailErr) {
          console.error('Email sending failed:', emailErr);
          res.json({ message: 'If your email is registered, you will receive a password reset link.' });
        }
      }
    );
  });
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  db.get(
    'SELECT id FROM users WHERE resetPasswordToken = ? AND resetPasswordExpires > ?',
    [token, Date.now()],
    async (err, user) => {
      if (err || !user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        'UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?',
        [hashedPassword, user.id],
        (err) => {
          if (err) {
            return res.status(500).json({ message: 'Password reset failed' });
          }

          res.json({ message: 'Password reset successful! You can now log in with your new password.' });
        }
      );
    }
  );
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;