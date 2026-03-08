-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid() if needed

-- =============================================================================
-- DROP TABLES (safe teardown for development resets - order matters for FK)
-- =============================================================================

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS events_classes CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================================================
-- TABLE: users
-- Central identity store for all system actors.
-- =============================================================================

CREATE TABLE users (
    user_id           SERIAL PRIMARY KEY,
    full_name         VARCHAR(120)  NOT NULL,
    email             VARCHAR(255)  UNIQUE NOT NULL,
    password_hash     TEXT          NOT NULL,
    phone             VARCHAR(20),
    role              VARCHAR(20)   NOT NULL DEFAULT 'member'
                          CHECK (role IN ('owner', 'staff', 'member')),
    status            VARCHAR(20)   NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'suspended', 'deactivated')),
    profile_photo_url TEXT,
    date_joined       DATE          DEFAULT CURRENT_DATE,
    last_login_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_status ON users (status);

COMMENT ON TABLE  users IS 'Central identity store. All system actors (owners, staff, members) are stored here.';
COMMENT ON COLUMN users.role IS 'RBAC role: owner = full access, staff = operational, member = self-service';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash (12 salt rounds minimum). Raw passwords are never stored.';


