const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../config/db');
const { validationResult } = require('express-validator');

const BCRYPT_ROUNDS = 12;
const JWT_EXPIRY    = parseInt(process.env.JWT_EXPIRY || '86400'); // 24h default

/**
 * Helper: write to audit_log
 */
const audit = async (actorId, action, entityType, entityId, newValue, ipAddress) => {
  try {
    await pool.query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, action, entityType, entityId, JSON.stringify(newValue), ipAddress]
    );
  } catch (err) {
    // Audit failures must not break the main request
    console.error('[Audit] Failed to write log:', err.message);
  }
};

/**
 * POST /api/auth/register
 * Creates a new user account.
 * Role defaults to 'member' unless 'owner' or 'staff' is specified.
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: 'Validation failed',
        errors:  errors.array(),
      });
    }

    const { full_name, email, password, phone, role = 'member' } = req.body;

    // Allow 'member', 'owner', and 'staff' for this development phase
    const allowedRoles = ['member', 'owner', 'staff'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        data:    null,
        message: 'Invalid role specified.',
        errors:  null,
      });
    }

    // Check if email is already registered
    const existing = await pool.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        data:    null,
        message: 'An account with that email already exists',
        errors:  null,
      });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Insert the new user
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, full_name, email, role, status, created_at`,
      [full_name.trim(), email.toLowerCase().trim(), password_hash, phone || null, role]
    );

    const newUser = result.rows[0];

    // Write to audit log
    await audit(newUser.user_id, 'user.registered', 'user', newUser.user_id,
      { email: newUser.email, role: newUser.role }, req.ip);

    return res.status(201).json({
      success: true,
      data: {
        user_id:    newUser.user_id,
        full_name:  newUser.full_name,
        email:      newUser.email,
        role:       newUser.role,
        created_at: newUser.created_at,
      },
      message: 'Registration successful',
      errors:  null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and returns a signed JWT in an httpOnly cookie.
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        data:    null,
        message: 'Validation failed',
        errors:  errors.array(),
      });
    }

    const { email, password } = req.body;

    // Fetch user by email
    const result = await pool.query(
      `SELECT user_id, full_name, email, password_hash, role, status
       FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // Use the same message for missing user and wrong password to prevent enumeration
      return res.status(401).json({
        success: false,
        data:    null,
        message: 'Invalid email or password',
        errors:  null,
      });
    }

    const user = result.rows[0];

    // Check account status before verifying password
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        data:    null,
        message: 'Your account has been suspended. Please contact the gym administrator.',
        errors:  null,
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        data:    null,
        message: 'Invalid email or password',
        errors:  null,
      });
    }

    // Sign JWT
    const tokenPayload = {
      user_id:   user.user_id,
      email:     user.email,
      role:      user.role,
      full_name: user.full_name,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    // Update last_login_at
    await pool.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = $1',
      [user.user_id]
    );

    // Write to audit log
    await audit(user.user_id, 'user.login', 'user', user.user_id,
      { email: user.email }, req.ip);

    // Set token in httpOnly cookie (XSS-safe)
    res.cookie('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   JWT_EXPIRY * 1000, // milliseconds
    });

    return res.status(200).json({
      success: true,
      data: {
        token,                      // Also returned in body for Postman / mobile clients
        user: {
          user_id:   user.user_id,
          full_name: user.full_name,
          email:     user.email,
          role:      user.role,
        },
      },
      message: 'Login successful',
      errors:  null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Clears the httpOnly cookie.
 */
const logout = (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({
    success: true,
    data:    null,
    message: 'Logged out successfully',
    errors:  null,
  });
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const me = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT user_id, full_name, email, phone, role, status, profile_photo_url,
              date_joined, last_login_at, created_at
       FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data:    null,
        message: 'User not found',
        errors:  null,
      });
    }

    return res.status(200).json({
      success: true,
      data:    result.rows[0],
      message: 'User profile retrieved',
      errors:  null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, me };
