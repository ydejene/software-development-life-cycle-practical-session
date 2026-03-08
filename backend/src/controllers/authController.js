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