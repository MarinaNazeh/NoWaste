-- Up Migration

-- US-28 no-card hold and check-in, US-30 no over-reservation (SRS 4.4, SDD 4.2 and 5.2), decisions D-90 to D-93.

-- SDD 4.2 Reservation. One bag per reservation. idempotency_key (SDD 3.2.3 IApi, NFR-15): the same request sent
-- again after a dropped connection returns the same reservation.
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings (id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('card', 'no-card')),
  status TEXT NOT NULL
    CHECK (status IN ('Pending payment', 'Confirmed', 'Held', 'Completed', 'Released', 'Cancelled', 'No-show')),
  price_paid NUMERIC(10, 2),
  hold_expires_at TIMESTAMPTZ,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reservations_hold_when_held CHECK (status <> 'Held' OR hold_expires_at IS NOT NULL),
  CONSTRAINT reservations_idempotency UNIQUE (consumer_id, idempotency_key)
);

-- D-91: a customer holds at most one no-card bag of a listing at a time.
CREATE UNIQUE INDEX reservations_one_hold_per_listing ON reservations (listing_id, consumer_id) WHERE status = 'Held';
-- The worker (C-19) looks for Held reservations whose hold has passed.
CREATE INDEX reservations_held_expiry ON reservations (hold_expires_at) WHERE status = 'Held';

-- SDD 4.2 PickupCode (FR-RES-10, BR-09). D-92: the code itself is kept (not a hash) so the customer can see it again
-- (FR-RES-08, E-RES-06). No two Active codes are the same. Partner-offer codes (Section 4.3) come later.
CREATE TABLE pickup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL UNIQUE REFERENCES reservations (id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (code ~ '^[0-9]+$'),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Used', 'Void')),
  used_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX pickup_codes_active_code ON pickup_codes (code) WHERE status = 'Active';

-- SDD 4.2 NoShow (FR-RES-13). A missed pickup counts once (unique reservation_id).
CREATE TABLE no_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL UNIQUE REFERENCES reservations (id) ON DELETE CASCADE,
  consumer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('hold expired', 'cancelled after start', 'vendor flag')),
  method TEXT NOT NULL CHECK (method IN ('card', 'no-card')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX no_shows_consumer ON no_shows (consumer_id, created_at);

-- SDD 5.5: the worker polls every minute (a time, so a settings row, never a constant in code).
INSERT INTO settings (key, value, description, source) VALUES
  ('C-19', '{"poll_seconds": 60}',
   'Scheduler / Worker: how often it checks for due jobs (expired holds)',
   'SDD 5.5; FR-RES-05');

-- Down Migration

DELETE FROM settings WHERE key = 'C-19';
DROP TABLE no_shows;
DROP TABLE pickup_codes;
DROP TABLE reservations;
