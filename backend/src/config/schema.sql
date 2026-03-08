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

-- =============================================================================
-- TABLE: plans
-- Catalog of membership tiers
-- =============================================================================

CREATE TABLE plans (
    plan_id               SERIAL PRIMARY KEY,
    name                  VARCHAR(100)    NOT NULL UNIQUE,
    description           TEXT,
    price                 NUMERIC(10, 2)  NOT NULL CHECK (price >= 0),
    billing_cycle         VARCHAR(20)     NOT NULL
                              CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual', 'custom')),
    duration_days         INTEGER         NOT NULL CHECK (duration_days > 0),
    max_classes_per_month INTEGER,
    includes_locker       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_active             BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_plans_active ON plans (is_active);

COMMENT ON TABLE  plans IS 'Catalog of membership tiers. All prices are in ETB.';
COMMENT ON COLUMN plans.duration_days IS 'Membership validity in days.';
COMMENT ON COLUMN plans.max_classes_per_month IS 'NULL means unlimited class bookings per month.';
