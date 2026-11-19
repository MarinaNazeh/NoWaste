-- Up Migration

-- D-105 (Maryam, 2026-11-17): the administrator gives a reason when rejecting a vendor or partner application (one of
-- the reasons below, with an optional note that is required for Other). Every rejection is kept, newest last (seq), so
-- the administrator sees the last reason when the applicant fixes the application and sends it again (Rejected ->
-- Pending, no limit). The same reasons are in @nowaste/shared REJECTION_REASONS.
CREATE TABLE application_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason TEXT NOT NULL
    CHECK (reason IN ('wrong_location', 'wrong_contact', 'not_food_business', 'duplicate_account', 'other')),
  note TEXT NULL CHECK (note IS NULL OR btrim(note) <> ''),
  rejected_by UUID NULL REFERENCES users (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT application_rejections_other_needs_note CHECK (reason <> 'other' OR note IS NOT NULL)
);

CREATE INDEX application_rejections_user_idx ON application_rejections (user_id, seq DESC);

-- The contact shown to a rejected applicant. A placeholder until the team has a real address (open question).
INSERT INTO settings (key, value, description, source) VALUES
  ('SUPPORT-CONTACT', '{"email": "support@nowaste.example"}',
   'Contact shown to rejected applicants (placeholder until the team has a real address)',
   'Decision D-105; FR-ACC-07');

-- Down Migration

DELETE FROM settings WHERE key = 'SUPPORT-CONTACT';
DROP TABLE application_rejections;
