-- Up Migration

-- D-97 (Maryam, 2026-11-14): a no-card customer chooses a pickup slot between the pickup start and end. Slots start at
-- the pickup start and every `slot_minutes` after it (a settings row, never a constant in code). The hold (BR-02)
-- starts when the chosen slot starts; the pickup code and "I'm on my way" are given from the slot start.
INSERT INTO settings (key, value, description, source) VALUES
  ('PICKUP-SLOTS', '{"slot_minutes": 30}',
   'No-card pickup slots: every 30 minutes from the pickup start, each starting before the pickup end',
   'Decision D-97; FR-RES-03');

ALTER TABLE reservations ADD COLUMN slot_start TIMESTAMPTZ;

-- Reservations made before slots existed: their slot is the later of the reservation time and the pickup start.
UPDATE reservations r SET slot_start = GREATEST(r.created_at, l.pickup_start)
FROM listings l
WHERE l.id = r.listing_id AND r.method = 'no-card';

ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_card_slot CHECK (method <> 'no-card' OR slot_start IS NOT NULL);

-- Down Migration

ALTER TABLE reservations DROP CONSTRAINT reservations_no_card_slot;
ALTER TABLE reservations DROP COLUMN slot_start;
DELETE FROM settings WHERE key = 'PICKUP-SLOTS';
