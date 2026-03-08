const pool = require('../config/db');

const getAllMembers = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ["role = 'member'"];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(full_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(parseInt(limit));
    params.push(offset);

    const result = await pool.query(
      `SELECT user_id, full_name, email, phone, status, date_joined, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countParams = params.slice(0, params.length - 2);
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      countParams
    );

    return res.status(200).json({
      success: true,
      data: {
        members: result.rows,
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit)),
      },
      message: 'Members retrieved successfully',
      errors: null,
    });
  } catch (err) {
    next(err);
  }
};

const getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'member' && req.user.user_id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Access denied',
        errors: null,
      });
    }

    const userResult = await pool.query(
      `SELECT user_id, full_name, email, phone, status, profile_photo_url,
              date_joined, last_login_at, created_at
       FROM users WHERE user_id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Member not found',
        errors: null,
      });
    }

    const membershipResult = await pool.query(
      `SELECT m.membership_id, m.start_date, m.end_date, m.status,
              p.name AS plan_name, p.price, p.billing_cycle, p.includes_locker
       FROM memberships m
       JOIN plans p ON m.plan_id = p.plan_id
       WHERE m.user_id = $1 AND m.status = 'active'
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        member: userResult.rows[0],
        membership: membershipResult.rows[0] || null,
      },
      message: 'Member retrieved successfully',
      errors: null,
    });
  } catch (err) {
    next(err);
  }
};

const getMemberById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'member' && req.user.user_id !== parseInt(id)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Access denied',
        errors: null,
      });
    }

    const userResult = await pool.query(
      `SELECT user_id, full_name, email, phone, status, profile_photo_url,
              date_joined, last_login_at, created_at
       FROM users WHERE user_id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: 'Member not found',
        errors: null,
      });
    }

    const membershipResult = await pool.query(
      `SELECT m.membership_id, m.start_date, m.end_date, m.status,
              p.name AS plan_name, p.price, p.billing_cycle, p.includes_locker
       FROM memberships m
       JOIN plans p ON m.plan_id = p.plan_id
       WHERE m.user_id = $1 AND m.status = 'active'
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        member: userResult.rows[0],
        membership: membershipResult.rows[0] || null,
      },
      message: 'Member retrieved successfully',
      errors: null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllMembers, getMemberById };