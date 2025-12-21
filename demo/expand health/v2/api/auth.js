/**
 * Authentication API Routes
 * Handles user registration, login, and token management
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const auditLogger = require('../services/auditLogger');

const router = express.Router();

// ============================================
// REGISTER NEW USER
// ============================================

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, status, created_at`,
      [email.toLowerCase(), passwordHash, firstName, lastName]
    );

    const newUser = result.rows[0];

    // Assign default "doctor" role
    const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', ['doctor']);
    if (roleResult.rows.length > 0) {
      await db.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [newUser.id, roleResult.rows[0].id]
      );
    }

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// LOGIN
// ============================================

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    const result = await db.query(
      `SELECT id, email, password_hash, first_name, last_name, avatar_url, status
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Log failed login attempt (user not found)
      await auditLogger.logLogin(req, null, email.toLowerCase(), false, 'User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is enabled
    if (user.status !== 'enabled') {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      // Log failed login attempt
      await auditLogger.logLogin(req, null, email.toLowerCase(), false, 'Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Log successful login
    await auditLogger.logLogin(req, user.id, user.email, true);

    // Get user roles
    const rolesResult = await db.query(`
      SELECT r.name, r.permissions
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `, [user.id]);

    const roles = rolesResult.rows.map(row => row.name);
    const permissions = rolesResult.rows.reduce((acc, row) => ({
      ...acc,
      ...row.permissions
    }), {});

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return user data and token
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        roles,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET CURRENT USER
// ============================================

router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    // Get user roles
    const rolesResult = await db.query(`
      SELECT r.name, r.permissions
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `, [req.user.id]);

    const roles = rolesResult.rows.map(row => row.name);
    const permissions = rolesResult.rows.reduce((acc, row) => ({
      ...acc,
      ...row.permissions
    }), {});

    res.json({
      user: {
        ...req.user,
        roles,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// REFRESH TOKEN
// ============================================

router.post('/refresh', authenticateToken, async (req, res, next) => {
  try {
    // Generate new token
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
