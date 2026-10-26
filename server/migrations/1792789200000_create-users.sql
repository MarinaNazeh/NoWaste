-- Up Migration

-- SDD 4.2 Data Dictionary, entity "User" (US-01, FR-ACC-01, NFR-09b, FR-RES-13, FR-TGI-04).
-- Roles and statuses are the values listed in the SDD. Vendor and partner profiles are separate tables (US-02, US-03).
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CITEXT makes the email unique regardless of letter case (E-ACC-01).
  email CITEXT UNIQUE,
  -- Stored in +20 form (decision D-12). The SDD type is VARCHAR; in PostgreSQL VARCHAR without a length equals TEXT.
  phone VARCHAR UNIQUE,
  -- Salted bcrypt hash only; the password itself is never stored (NFR-09b).
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('consumer', 'vendor', 'charity', 'composting', 'admin')),
  status TEXT NOT NULL CHECK (status IN ('Active', 'Pending', 'Approved', 'Rejected', 'Suspended', 'Removed')),
  language TEXT NOT NULL CHECK (language IN ('ar', 'en')),
  no_card_blocked_until TIMESTAMPTZ,
  flagged_for_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- SDD 4.2: at least one of email or phone.
  CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Down Migration

DROP TABLE IF EXISTS users;
