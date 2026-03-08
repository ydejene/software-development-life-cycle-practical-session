const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'fitsync_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// Verify connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] Connection error:', err.message);
    return;
  }
  console.log('[DB] Connected to PostgreSQL:', process.env.DB_NAME || 'fitsync_db');
  release();
});

module.exports = pool;
