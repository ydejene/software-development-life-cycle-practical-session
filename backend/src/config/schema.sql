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

-- =============================================================================
-- TABLE: memberships
-- Active link between a user and a plan
-- =============================================================================

CREATE TABLE memberships (
    membership_id SERIAL PRIMARY KEY,
    user_id       INTEGER        NOT NULL
                      REFERENCES users (user_id) ON DELETE CASCADE,
    plan_id       INTEGER        NOT NULL
                      REFERENCES plans (plan_id) ON DELETE RESTRICT,
    start_date    DATE           NOT NULL,
    end_date      DATE           NOT NULL,
    status        VARCHAR(20)    NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    enrolled_by   INTEGER        REFERENCES users (user_id) ON DELETE SET NULL,
    notes         TEXT,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_membership_dates CHECK (end_date > start_date)
);

CREATE INDEX idx_memberships_user_id ON memberships (user_id);
CREATE INDEX idx_memberships_status ON memberships (status);
CREATE INDEX idx_memberships_end_date ON memberships (end_date);

COMMENT ON TABLE  memberships IS 'Enrollment records linking members to plans.';
COMMENT ON COLUMN memberships.end_date IS 'Expiry date for alerts.';
COMMENT ON COLUMN memberships.enrolled_by IS 'Staff/owner who created the record.';

-- =============================================================================
-- TABLE: payments
-- Financial ledger for all transactions
-- =============================================================================

CREATE TABLE payments (
    payment_id       SERIAL PRIMARY KEY,
    membership_id    INTEGER         NOT NULL
                         REFERENCES memberships (membership_id) ON DELETE RESTRICT,
    user_id          INTEGER         NOT NULL
                         REFERENCES users (user_id) ON DELETE RESTRICT,
    amount           NUMERIC(10, 2)  NOT NULL CHECK (amount > 0),
    currency         VARCHAR(5)      NOT NULL DEFAULT 'ETB',
    payment_method   VARCHAR(30)     NOT NULL
                         CHECK (payment_method IN ('telebirr', 'cbe_birr', 'cash')),
    status           VARCHAR(20)     NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    due_date         DATE,
    paid_at          TIMESTAMPTZ     DEFAULT CURRENT_TIMESTAMP,
    reference_number VARCHAR(100)    UNIQUE,
    recorded_by      INTEGER         REFERENCES users (user_id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments (user_id);
CREATE INDEX idx_payments_membership_id ON payments (membership_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_paid_at ON payments (paid_at);

COMMENT ON TABLE  payments IS 'Financial ledger. Every transaction recorded.';
COMMENT ON COLUMN payments.reference_number IS 'Transaction ID from gateway or NULL for cash.';
COMMENT ON COLUMN payments.recorded_by IS 'Staff who manually recorded payment.';

-- =============================================================================
-- TABLE: events_classes
-- Schedule of gym sessions
-- =============================================================================

CREATE TABLE events_classes (
    event_id          SERIAL PRIMARY KEY,
    title             VARCHAR(150)    NOT NULL,
    description       TEXT,
    event_type        VARCHAR(30)     CHECK (event_type IN ('class', 'event', 'workshop')),
    instructor_id     INTEGER         REFERENCES users (user_id) ON DELETE SET NULL,
    start_datetime    TIMESTAMPTZ     NOT NULL,
    end_datetime      TIMESTAMPTZ     NOT NULL,
    location          VARCHAR(100),
    max_capacity      INTEGER         NOT NULL CHECK (max_capacity > 0),
    current_bookings  INTEGER         NOT NULL DEFAULT 0 CHECK (current_bookings >= 0),
    is_cancelled      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_event_times    CHECK (end_datetime > start_datetime),
    CONSTRAINT chk_event_capacity CHECK (current_bookings <= max_capacity)
);

CREATE INDEX idx_events_start_datetime ON events_classes (start_datetime);
CREATE INDEX idx_events_is_cancelled   ON events_classes (is_cancelled);

COMMENT ON TABLE  events_classes IS 'Class and event schedule. Members book slots from this table.';
COMMENT ON COLUMN events_classes.current_bookings IS 'Updated by triggers or app logic.';

-- =============================================================================
-- TABLE: bookings
-- Real-time class reservation system.
-- =============================================================================

CREATE TABLE bookings (
    booking_id   SERIAL PRIMARY KEY,
    user_id      INTEGER      NOT NULL
                     REFERENCES users (user_id) ON DELETE CASCADE,
    event_id     INTEGER      NOT NULL
                     REFERENCES events_classes (event_id) ON DELETE CASCADE,
    status       VARCHAR(20)  NOT NULL DEFAULT 'confirmed'
                     CHECK (status IN ('confirmed', 'cancelled', 'waitlisted', 'attended')),
    booked_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ,
    attended     BOOLEAN      NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_booking UNIQUE (user_id, event_id)
);

CREATE INDEX idx_bookings_user_id  ON bookings (user_id);
CREATE INDEX idx_bookings_event_id ON bookings (event_id);

COMMENT ON TABLE bookings IS 'Class reservations. UNIQUE constraint prevents duplicate bookings per member per class.';

-- =============================================================================
-- TABLE: alerts
-- Automated notification system for membership expiry and overdue payments.
-- =============================================================================

CREATE TABLE alerts (
    alert_id           SERIAL PRIMARY KEY,
    user_id            INTEGER      NOT NULL
                           REFERENCES users (user_id) ON DELETE CASCADE,
    alert_type         VARCHAR(50)  NOT NULL
                           CHECK (alert_type IN (
                               'membership_expiring',
                               'membership_expired',
                               'payment_overdue',
                               'payment_confirmed',
                               'booking_reminder'
                           )),
    message            TEXT,
    is_read            BOOLEAN      NOT NULL DEFAULT FALSE,
    is_dismissed       BOOLEAN      NOT NULL DEFAULT FALSE,
    related_payment_id INTEGER      REFERENCES payments (payment_id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dismissed_at       TIMESTAMPTZ
);

CREATE INDEX idx_alerts_user_unread ON alerts (user_id, is_read);

COMMENT ON TABLE alerts IS 'Notification records. Generated by the backend alert service on a scheduled basis.';

-- =============================================================================
-- TABLE: audit_log
-- Immutable forensic trail of all significant system events.
-- =============================================================================

CREATE TABLE audit_log (
    log_id      BIGSERIAL    PRIMARY KEY,
    actor_id    INTEGER      REFERENCES users (user_id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   INTEGER,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_actor_id  ON audit_log (actor_id);
CREATE INDEX idx_audit_action    ON audit_log (action);
CREATE INDEX idx_audit_created_at ON audit_log (created_at);

COMMENT ON TABLE audit_log IS 'Write-only forensic trail. Never update or delete rows. Application layer enforces this.';
COMMENT ON COLUMN audit_log.old_value IS 'JSONB snapshot of the record state before the action.';
COMMENT ON COLUMN audit_log.new_value IS 'JSONB snapshot of the record state after the action.';

-- =============================================================================
-- SEED DATA (development only)
-- =============================================================================

INSERT INTO users (full_name, email, password_hash, phone, role, status) VALUES
    ('Gym Owner',  'owner@fitsync.dev',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRSm6lGxMJhCKhpX0c9i', '+251900000001', 'owner',  'active'),
    ('Staff User', 'staff@fitsync.dev',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRSm6lGxMJhCKhpX0c9i', '+251900000002', 'staff',  'active'),
    ('Test Member','member@fitsync.dev', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRSm6lGxMJhCKhpX0c9i', '+251900000003', 'member', 'active');

INSERT INTO plans (name, description, price, billing_cycle, duration_days, max_classes_per_month, includes_locker) VALUES
    ('Basic Monthly',    'Gym floor access only',             1500.00, 'monthly',   30,  NULL,  FALSE),
    ('Standard Monthly', 'Gym + unlimited class bookings',    2500.00, 'monthly',   30,  NULL,  FALSE),
    ('Premium Monthly',  'Gym + classes + locker',            3500.00, 'monthly',   30,  NULL,  TRUE),
    ('Quarterly',        'Standard plan billed quarterly',    6500.00, 'quarterly', 90,  NULL,  FALSE),
    ('Annual',           'Best value - full year access',    22000.00, 'annual',   365,  NULL,  TRUE);

INSERT INTO memberships (user_id, plan_id, start_date, end_date, status, enrolled_by) VALUES
    (3, 2, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active', 1);

INSERT INTO payments (membership_id, user_id, amount, currency, payment_method, status, reference_number, recorded_by) VALUES
    (1, 3, 2500.00, 'ETB', 'cash', 'completed', NULL, 1);

INSERT INTO events_classes (title, event_type, instructor_id, start_datetime, end_datetime, location, max_capacity) VALUES
    ('Morning HIIT',    'class', 2, NOW() + INTERVAL '1 day',  NOW() + INTERVAL '1 day'  + INTERVAL '1 hour', 'Main Floor', 20),
    ('Yoga Flow',       'class', 2, NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '1 hour', 'Studio A',   15),
    ('CrossFit WOD',    'class', 2, NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '1 hour', 'Main Floor', 12);