import express, { Request, Response } from 'express';
import { db } from '../database';
import { User } from '../types';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  isValidEmail,
  isValidPassword,
} from '../utils/auth';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      if (row) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      db.run(
        `INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)`,
        [email.toLowerCase(), passwordHash, displayName || null],
        function (err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;

          // Generate tokens (new users are not admin by default)
          const accessToken = generateAccessToken({ userId, email: email.toLowerCase(), isAdmin: false });
          const refreshToken = generateRefreshToken({ userId, email: email.toLowerCase(), isAdmin: false });

          // Store refresh token in database
          db.run(
            'UPDATE users SET refresh_token = ? WHERE id = ?',
            [refreshToken, userId],
            (err) => {
              if (err) {
                console.error('Error storing refresh token:', err);
              }
            }
          );

          res.status(201).json({
            message: 'User created successfully',
            user: {
              id: userId,
              email: email.toLowerCase(),
              displayName: displayName || null,
            },
            accessToken,
            refreshToken,
          });
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()],
      async (err, row: User | undefined) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Server error' });
        }

        if (!row) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValid = await comparePassword(password, row.password_hash!);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate tokens
        const accessToken = generateAccessToken({ userId: row.id!, email: row.email, isAdmin: !!row.is_admin });
        const refreshToken = generateRefreshToken({ userId: row.id!, email: row.email, isAdmin: !!row.is_admin });

        // Store refresh token in database
        db.run(
          'UPDATE users SET refresh_token = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [refreshToken, row.id],
          (err) => {
            if (err) {
              console.error('Error storing refresh token:', err);
            }
          }
        );

        res.json({
          message: 'Login successful',
          user: {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            isAdmin: !!row.is_admin,
          },
          accessToken,
          refreshToken,
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Check if refresh token exists in database
    db.get(
      'SELECT id, email, display_name, is_admin FROM users WHERE id = ? AND refresh_token = ?',
      [payload.userId, refreshToken],
      (err, row: User | undefined) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Server error' });
        }

        if (!row) {
          return res.status(403).json({ error: 'Invalid refresh token' });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken({
          userId: row.id!,
          email: row.email,
          isAdmin: !!row.is_admin,
        });

        res.json({
          accessToken: newAccessToken,
          user: {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            isAdmin: !!row.is_admin,
          },
        });
      }
    );
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate refresh token)
 */
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Remove refresh token from database
    db.run('UPDATE users SET refresh_token = NULL WHERE id = ?', [userId], (err) => {
      if (err) {
        console.error('Error during logout:', err);
        return res.status(500).json({ error: 'Server error' });
      }

      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    db.get(
      'SELECT id, email, display_name, is_admin, created_at FROM users WHERE id = ?',
      [userId],
      (err, row: User | undefined) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Server error' });
        }

        if (!row) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({
          user: {
            id: row.id,
            email: row.email,
            displayName: row.display_name,
            isAdmin: !!row.is_admin,
            createdAt: row.created_at,
          },
        });
      }
    );
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
